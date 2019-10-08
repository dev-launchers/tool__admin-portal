addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})
const GITHUB_API = 'https://api.github.com'
const TRAVIS_API = 'https://api.travis-ci.com'
const DEV_USER = 'dev-launchers-sandbox'
const PROD_ORG = "dev-launchers"
const USER_AGENT = 'dev-launchers-internal-api'

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
    const url = new URL(request.url)
    const projectName = url.searchParams.get("project")

    if (projectName == null) {
        console.log("project name is not specified in query parameter")
        return new Response(null, {
            "status": 400,
            "statusText": "project name is not specified in query parameter",
        })
    }
    const repoName = "project__" + projectName

    const githubAuthToken = await ADMIN_PORTAL.get("githubAuthToken")
    const githubAPIClient = new GithubAPIClient(GITHUB_API, githubAuthToken, USER_AGENT)

    let resp = await githubAPIClient.createDevRepo(repoName, DEV_USER)

    if (resp.status != 201) {
        console.log(`Failed to create dev ${repoName}, status ${resp.status}`)
        return resp;
    }
    console.log("Created dev repo")

    resp = await githubAPIClient.createProdRepo(repoName, PROD_ORG)
    if (resp.status != 201) {
        console.log(`Failed to create prod repo ${repoName}, status ${resp.status}`)
        return resp
    }
    console.log("Created prod repo")

    resp = await githubAPIClient.enableGithubPage(repoName, DEV_USER)
    if (resp.status != 201) {
        console.log(`Failed to enabled github page on dev repo ${repoName} owned by ${DEV_USER}, status ${resp.status}`)
        return resp
    }
    console.log("Enabled github page on dev repo")

    resp = await githubAPIClient.enableGithubPage(repoName, PROD_ORG)
    if (resp.status != 201) {
        console.log(`Failed to enabled github page on prod repo ${repoName} owned by ${PROD_ORG}, status ${resp.status}`)
        return resp
    }
    console.log("Enabled github page on prod repo")

    const travisAuthToken = await ADMIN_PORTAL.get("travisAuthToken")
    const travisAPIClient = new TravisAPIClient(TRAVIS_API, travisAuthToken, USER_AGENT)

    const travisID = await travisAPIClient.findTravisIDByRepoName(DEV_USER, repoName)
    if (travisID == undefined) {
        err = `ID for ${repoName} not found`
        console.log(err)
        resp = new Response(null, {
            "status": 404,
            "statusText": err,
        })
        return resp
    }
    console.log(`ID of ${repoName} is ${travisID}`)

    // Upload github token
    const githubPageDeployToken = await ADMIN_PORTAL.get("githubPageDeployToken")
    resp = await travisAPIClient.uploadEnvVar(travisID, "GITHUB_TOKEN", githubPageDeployToken)
    if (resp.status != 201) {
        console.log(`Failed to upload github page deploy token for ${repoName}, status ${resp.status}`)
        return resp
    }
    console.log("upload GITHUB_TOKEN")

    // Upload repo name
    resp = await travisAPIClient.uploadEnvVar(travisID, "REPO_NAME", repoName)
    if (resp.status != 201) {
        console.log(`Failed to upload repo name for ${repoName}, status ${resp.status}`)
        return resp
    }
    console.log("upload REPO_NAME")
    return resp
}

class GithubAPIClient {
    constructor(githubAPI, authToken, userAgent) {
        this.baseURL = githubAPI
        this.authHeaders = {
            'Authorization': `token ${authToken}`,
            'User-Agent': userAgent,
            'Content-Type': "application/json"
        }
    }

    async createDevRepo(repoName, user) {
        const req = new Request(
            `${this.baseURL}/repos/${user}/template__project/generate`,
            {
                method: 'POST',
                headers: addAcceptHeader(this.authHeaders, "application/vnd.github.baptiste-preview+json"),
                body: JSON.stringify({
                    "owner": user,
                    "name": repoName,
                    "description": "Development repository for " + repoName,
                    "private": false,
                }),
            },
        )
        return asyncFetch(req)
    }

    async createProdRepo(repoName, org) {
        const req = new Request(
            `${this.baseURL}/orgs/${org}/repos`,
            {
                method: 'POST',
                headers: this.authHeaders,
                body: JSON.stringify({
                    "name": repoName,
                    "description": "Production repository for " + repoName,
                    "auto_init": true,
                    "private": false,
                }),
            },
        )
        return asyncFetch(req)
    }

    async enableGithubPage(repoName, owner) {
        const req = new Request(
            `${this.baseURL}/repos/${owner}/${repoName}/pages`,
            {
                method: 'POST',
                headers: addAcceptHeader(this.authHeaders, "application/vnd.github.switcheroo-preview+json"),
                body: JSON.stringify({
                    "source": {
                        "branch": "master",
                    },
                }),
            },
        )
        return asyncFetch(req)
    }
}

class TravisAPIClient {
    constructor(travisAPI, authToken, userAgent) {
        this.baseURL = travisAPI
        this.authHeaders = {
            'Authorization': `token ${authToken}`,
            'User-Agent': userAgent,
            'Travis-API-Version': '3',
            'Content-Type': 'application/json',
        }
    }

    async findTravisIDByRepoName(owner, repoName) {
        const req = new Request(
            `${this.baseURL}/owner/${owner}/repos`,
            {
                method: 'GET',
                headers: this.authHeaders,
            }
        )
        const resp = await asyncFetch(req)
        if (resp.status != 200) {
            return undefined
        }

        return resp.json().then(body => {
            const repoWithName = body.repositories.find(repo => {
                return repo.name == repoName
            })
            return repoWithName.id
        })
    }

    async uploadEnvVar(travisID, name, val) {
        const req = new Request(
            `${this.baseURL}/repo/${travisID}/env_vars`,
            {
                method: 'POST',
                headers: this.authHeaders,
                body: JSON.stringify({
                    "env_var.name": name,
                    "value": val,
                    "public": false,
                }),
            },
        )
        return asyncFetch(req)
    }
}

async function asyncFetch(req) {
    const resp = await fetch(req)
        .then(function (response) {
            return response
        });
    return resp
}

function addAcceptHeader(baseHeaders, acceptValue) {
    let headers = baseHeaders
    headers["Accept"] = acceptValue
    return headers
}

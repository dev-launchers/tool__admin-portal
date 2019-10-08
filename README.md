# tool__admin-portal
Dev Launchers Admin Portal - A API running on Cloudflare Workers to manage various aspects of the program/organization

Endpoints:
- `/?project=:repoName`: Create a repo in dev-launchers-sandbox from template[https://github.com/dev-launchers/template__project] and an empty repo in dev-launchers for the given repo name. It also enables github page for the repos created and sets up Travis CI.    
# tool__admin-portal
Dev Launchers Admin Portal - An API running on Cloudflare Workers to manage various aspects of the program/organization

Endpoints:
- `/?project=:repoName`: Creates a repo in dev-launchers-sandbox (our user account) from template[https://github.com/dev-launchers/template__project] and an empty repo in dev-launchers (our organization) for the given repo name. It also:
 - Enables GitHub Pages for the created repos
 - Sets up Travis CI in the created repos

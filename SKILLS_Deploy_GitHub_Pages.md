# GithUb Pages Deployment

## Goals
- Deploy this application in GitHub Pages
- Use GitHub Actions triggered manually to deploy to GitHub pages
- Use GitHub Actions secrets for any secrets
- Ensure users use their GitHub login to access this GitHug pages URL


## Implementation
- Have .github/workflows for GitHub actions manual executions specific to deploying to GitHub Pages
- Have multiple GH actions sequenced numbered one for building the app, second for creating the docker image, third for deploying to GitHub pages and foruth publishing this codebase to Docker Hub using the credentials provided in the GH Actions secrets
- All GH workflow actions are executed manually and nothing is automatic
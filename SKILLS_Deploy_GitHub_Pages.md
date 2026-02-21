# GitHub Pages Deployment Model

## Deployment Model ID
`github-pages`

## Overview
This is one of multiple deployment models for the IT Pros WordADay application. This model deploys the Next.js frontend as a static export to GitHub Pages. There is no backend in this model — the frontend falls back to loading static JSON files bundled in the build. All CI/CD is driven by manually-triggered GitHub Actions workflows.

See also:
- `SKILLS_Deploy_AWS_ECS_Fargate.md` — serverless container deployment to ECS Fargate
- `SKILLS_Deploy_AWS.md` — Blue/Green EC2 deployment with Auto Scaling Groups

## Goals
- Deploy this application in GitHub Pages
- Use GitHub Actions triggered manually to deploy to GitHub Pages
- Use GitHub Actions secrets for any secrets
- Ensure users use their GitHub login to access this GitHub Pages URL

## GitHub Actions Authentication

### Authenticating to AWS from GitHub Actions (If Needed)

Even though this model deploys to GitHub Pages (not AWS), future enhancements (S3 uploads, CloudFront invalidation) may require AWS access. All AWS authentication uses **[aws-actions/configure-aws-credentials@v6](https://github.com/aws-actions/configure-aws-credentials)** with OIDC federation. **No AWS access keys are stored in GitHub.**

Reference: [aws-actions/configure-aws-credentials — OIDC Configuration](https://github.com/aws-actions/configure-aws-credentials#oidc-configuration)

**One-Time AWS Setup**:

1. Create the OIDC identity provider in AWS:
   ```
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com
   ```

2. Create an IAM role with this trust policy (restricts to this repo only):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:javakishore-veleti/ITProsWordADay:*"
           }
         }
       }
     ]
   }
   ```

3. Store the role ARN as `AWS_IAM_ROLE_ARN` and region as `AWS_REGION` in GitHub Actions secrets

**Usage in Workflows** (add to any workflow that needs AWS access):
```yaml
permissions:
  id-token: write   # Required for GitHub OIDC token
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v6
    with:
      role-to-assume: ${{ secrets.AWS_IAM_ROLE_ARN }}
      aws-region: ${{ secrets.AWS_REGION }}
```

No `aws-access-key-id` or `aws-secret-access-key` inputs are used. The action automatically uses the OIDC token when `id-token: write` permission is present and `role-to-assume` is specified.

### Authenticating to DockerHub from GitHub Actions

Workflow 04 (Publish to DockerHub) requires DockerHub credentials:

| Secret Name | Description |
|---|---|
| `DOCKERHUB_USERNAME` | DockerHub account username |
| `DOCKERHUB_TOKEN` | DockerHub access token (not password — generate at hub.docker.com/settings/security) |

### Authenticating to GitHub Pages from GitHub Actions

Workflow 03 (Deploy to GitHub Pages) uses the built-in `GITHUB_TOKEN` which is automatically available. No additional secrets needed. The workflow must declare:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

And the repository's **Settings > Pages > Source** must be set to **"GitHub Actions"** (not "Deploy from a branch").

## Implementation

### GitHub Actions Workflows

All workflows are in `.github/workflows/` and are executed **manually only** (`workflow_dispatch`). Nothing is automatic.

| # | Workflow File | Name | Purpose |
|---|---|---|---|
| 01 | `01-build.yml` | Build | Build Next.js frontend and Go backend, upload as artifacts |
| 02 | `02-docker-build.yml` | Docker Build | Build and verify the Docker image locally |
| 03 | `03-deploy-github-pages.yml` | Deploy to GitHub Pages | Build Next.js static export with `basePath=/ITProsWordADay` and deploy to GitHub Pages |
| 04 | `04-publish-dockerhub.yml` | Publish to DockerHub | Build and push Docker image to DockerHub with `latest` and SHA tags |

### GitHub Pages Configuration

- `next.config.ts` sets `basePath: "/ITProsWordADay"` and `assetPrefix: "/ITProsWordADay"` when `GITHUB_PAGES=true`
- `trailingSlash: true` generates `index.html` inside directories for clean URLs
- A `.nojekyll` file is added to the build output to prevent GitHub's Jekyll from overriding the Next.js export
- The frontend API client (`lib/api.ts`) detects the Go backend is unreachable and falls back to loading static JSON files from `public/data/words/`

### All GitHub Actions Secrets Summary (This Model)

| Secret Name | Used By | Required | Description |
|---|---|---|---|
| `DOCKERHUB_USERNAME` | Workflow 04 | Yes (for 04 only) | DockerHub username |
| `DOCKERHUB_TOKEN` | Workflow 04 | Yes (for 04 only) | DockerHub access token |
| `AWS_IAM_ROLE_ARN` | Any AWS workflow | Optional | IAM role for OIDC (only if AWS access is needed) |
| `AWS_REGION` | Any AWS workflow | Optional | AWS region (only if AWS access is needed) |

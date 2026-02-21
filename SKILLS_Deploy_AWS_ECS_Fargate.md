# AWS ECS Fargate Deployment Model

## Deployment Model ID
`aws-ecs-fargate`

## Overview
This is one of multiple deployment models for the IT Pros WordADay application. This model deploys the full-stack application (Go backend + Next.js frontend in a single Docker container) to AWS ECS Fargate behind an Application Load Balancer (ALB), with CloudWatch for logging. All CI/CD is driven by manually-triggered GitHub Actions workflows.

See also:
- `SKILLS_Deploy_GitHub_Pages.md` — static-only deployment to GitHub Pages
- `SKILLS_Deploy_AWS.md` — Blue/Green EC2 deployment with Auto Scaling Groups

## Architecture Diagram

![AWS ECS Fargate Architecture](./Docs/Design/aws-ecs-fargate-architecture.png)

> Full diagram source: [Docs/Design/aws-ecs-fargate-architecture.puml](./Docs/Design/aws-ecs-fargate-architecture.puml)

## Deployment Flow (Step by Step)

1. **Developer triggers** a GitHub Actions workflow manually (`workflow_dispatch`)
2. **GitHub Actions** checks out the code, builds the multi-stage Docker image using the existing `Dockerfile` at the repo root
3. **Docker image is pushed** to AWS ECR (Elastic Container Registry) with `latest` and `git-sha` tags
4. **ECS Task Definition** is updated with the new ECR image URI
5. **ECS Service** on the Fargate cluster is updated, triggering a rolling deployment
6. **ALB** health checks confirm the new tasks are healthy before draining old tasks
7. **CloudWatch** receives all container logs automatically via the `awslogs` log driver

## AWS Services Used

| AWS Service | Purpose |
|---|---|
| **ECR** (Elastic Container Registry) | Private Docker image registry storing the application images |
| **ECS** (Elastic Container Service) | Container orchestration — manages task definitions and services |
| **Fargate** | Serverless compute engine for ECS — no EC2 instances to manage |
| **ALB** (Application Load Balancer) | Routes HTTP/HTTPS traffic to healthy ECS tasks on port 8080 |
| **CloudWatch Logs** | Centralized logging for all container stdout/stderr |
| **IAM** | Roles for ECS task execution, GitHub Actions OIDC, and CloudWatch access |

## Existing Assets This Model Reuses

- **Dockerfile** at repo root: Multi-stage build (Go backend + Next.js static export + Alpine production image) exposing port 8080 with a `/api/health` healthcheck
- **Go backend** serves both the API (`/api/*`) and the static frontend files from `/app/public/`
- The container is self-contained — one image, one port, no sidecar containers needed

## Environment Variables for AWS Mode

When deployed to AWS, the container must receive these environment variables via the ECS Task Definition:

| Variable | Value | Description |
|---|---|---|
| `DEPLOYMENT_MODE` | `aws` | Tells the Go backend to use AWS-native services |
| `PORT` | `8080` | Server port (matches Dockerfile EXPOSE and ALB target group) |
| `DATA_ROOT_PATH` | `./data` | Path to word JSON files inside the container |
| `ENABLE_REDIS` | `false` | Set to `true` if ElastiCache Redis is provisioned |
| `REDIS_ADDR` | `""` | Redis endpoint (only when ENABLE_REDIS=true) |
| `PAGE_SIZE` | `20` | Default pagination size |

## GitHub Actions to AWS Authentication

GitHub Actions workflows authenticate to AWS using **[aws-actions/configure-aws-credentials@v6](https://github.com/aws-actions/configure-aws-credentials)** with OIDC federation. **No AWS access keys or secrets are stored in GitHub.** The action uses GitHub's built-in OIDC provider to obtain short-lived temporary credentials for each workflow run.

### How It Works

1. The workflow declares `permissions: id-token: write` to enable GitHub's OIDC provider
2. `aws-actions/configure-aws-credentials@v6` requests a JWT from GitHub's OIDC endpoint (`token.actions.githubusercontent.com`)
3. The action calls AWS STS `AssumeRoleWithWebIdentity`, passing the JWT and the IAM role ARN
4. AWS STS verifies the JWT against the registered GitHub OIDC identity provider
5. AWS returns temporary credentials (access key, secret key, session token) valid only for that workflow run
6. All subsequent AWS CLI and SDK calls use these temporary credentials automatically

### One-Time AWS Setup for OIDC Federation

Reference: [aws-actions/configure-aws-credentials — OIDC Configuration](https://github.com/aws-actions/configure-aws-credentials#oidc-configuration)

**Step 1: Create the OIDC Identity Provider**

In the AWS Console: IAM > Identity Providers > Add Provider, or via CLI:
```
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

**Step 2: Create the IAM Role with Trust Policy**

The trust policy restricts the role to only be assumed by workflows from this specific repository:
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

**Step 3: Attach Permissions to the Role**

For the ECS Fargate model, the role needs:
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `ElasticLoadBalancingFullAccess`
- `CloudWatchLogsFullAccess`
- `AWSCloudFormationFullAccess`
- `IAMFullAccess` (to create service roles — can be scoped down)

**Step 4: Store the Role ARN in GitHub Actions Secrets**

Go to GitHub repo > Settings > Secrets and variables > Actions, then add:
- `AWS_IAM_ROLE_ARN` = `arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsECSDeployRole`
- `AWS_REGION` = `eu-west-2`

### Usage in Every GitHub Actions Workflow

Every workflow that interacts with AWS must declare OIDC permissions and call the action:

```yaml
permissions:
  id-token: write   # Required for GitHub OIDC token
  contents: read     # Required to checkout code

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v6
    with:
      role-to-assume: ${{ secrets.AWS_IAM_ROLE_ARN }}
      aws-region: ${{ secrets.AWS_REGION }}
```

No `aws-access-key-id` or `aws-secret-access-key` inputs are used. The action automatically uses the OIDC token when `id-token: write` permission is present and `role-to-assume` is specified.

## GitHub Actions Secrets Required

Only **two secrets** are needed for AWS authentication — no AWS access keys:

### Authentication Secrets

| Secret Name | Description | Example |
|---|---|---|
| `AWS_REGION` | AWS region for all resources | `eu-west-2` |
| `AWS_IAM_ROLE_ARN` | IAM role ARN for OIDC federation | `arn:aws:iam::123456789012:role/GitHubActionsECSDeployRole` |

### ECS Fargate Model-Specific Secrets

| Secret Name | Description | Example |
|---|---|---|
| `AWS_ECR_REPOSITORY` | ECR repository name | `itpros-wordaday` |
| `AWS_ECS_CLUSTER` | ECS cluster name | `itpros-wordaday-cluster` |
| `AWS_ECS_SERVICE` | ECS service name | `itpros-wordaday-service` |
| `AWS_ECS_TASK_FAMILY` | ECS task definition family name | `itpros-wordaday-task` |

## GitHub Actions Workflow

A **single consolidated workflow** handles the entire ECS Fargate deployment pipeline:

### Workflow 05: `05-aws-ecs-fargate-deploy.yml`

**Name**: `05 - AWS ECS Fargate Deploy`

**Trigger**: `workflow_dispatch` with a choice input:
- `infrastructure` — create/update CloudFormation stack only
- `build-and-deploy` — build Docker image, push to ECR, deploy to ECS
- `full (infrastructure + build + deploy)` — all of the above sequentially

**Permissions**: `id-token: write`, `contents: read`

**Jobs**:

1. **infrastructure** (conditional): Deploys `aws/ecs-fargate/cloudformation.yml` via `aws-actions/aws-cloudformation-github-deploy@v1`, outputs ALB DNS and ECR URI
2. **build-push** (conditional, runs after infrastructure): Builds Docker image from repo root `Dockerfile`, pushes to ECR with `latest` and git SHA tags using `aws-actions/amazon-ecr-login@v2` + `docker/build-push-action@v5`
3. **deploy** (runs after build-push): Renders the task definition from `aws/ecs-fargate/ecs-task-definition.json` with new image URI via `aws-actions/amazon-ecs-render-task-definition@v1`, deploys via `aws-actions/amazon-ecs-deploy-task-definition@v2` with `wait-for-service-stability: true`

---

## Files to Generate

### 1. `aws/ecs-fargate/ecs-task-definition.json`

A standard ECS task definition JSON file:

- **Family**: references `AWS_ECS_TASK_FAMILY`
- **Requires compatibilities**: `FARGATE`
- **Network mode**: `awsvpc`
- **CPU**: `256` (0.25 vCPU)
- **Memory**: `512` (512 MB)
- **Execution role ARN**: placeholder `<EXECUTION_ROLE_ARN>` (replaced at deploy time)
- **Container definition**:
  - **Name**: `itpros-wordaday`
  - **Image**: placeholder `<IMAGE>` (replaced by `amazon-ecs-render-task-definition` action)
  - **Port mappings**: container port `8080`, protocol `tcp`
  - **Essential**: `true`
  - **Environment variables**: `DEPLOYMENT_MODE=aws`, `PORT=8080`, `DATA_ROOT_PATH=./data`, `PAGE_SIZE=20`
  - **Log configuration**: `awslogs` driver with log group `/ecs/itpros-wordaday`, region from parameter, stream prefix `ecs`
  - **Health check**: `CMD-SHELL`, `wget -q --spider http://localhost:8080/api/health || exit 1`, interval 30s, timeout 5s, retries 3, start period 10s

### 2. `aws/ecs-fargate/cloudformation.yml`

A CloudFormation template that creates the full runtime infrastructure:

**Parameters** (all passed at deploy time):
- `VpcId` — VPC where resources are created
- `SubnetIds` — comma-separated list of subnet IDs (at least 2 for ALB)
- `ContainerPort` — default `8080`
- `DesiredCount` — number of ECS tasks, default `1`
- `ImageUri` — the ECR image URI to deploy

**Resources to create**:

1. **CloudWatch Log Group**: `/ecs/itpros-wordaday`, retention 30 days
2. **ECR Repository**: `itpros-wordaday`, image tag mutability `MUTABLE`, image scan on push enabled
3. **ECS Cluster**: `itpros-wordaday-cluster`, container insights enabled
4. **ALB Security Group**: allows inbound HTTP (80) and HTTPS (443) from `0.0.0.0/0`, all outbound
5. **ECS Task Security Group**: allows inbound on container port (8080) from the ALB security group only, all outbound
6. **Application Load Balancer**: internet-facing, in the provided subnets, with the ALB security group
7. **ALB Target Group**: target type `ip`, port 8080, protocol HTTP, VPC from parameter, health check path `/api/health`, health check interval 30s, healthy threshold 2, unhealthy threshold 3
8. **ALB Listener**: port 80, default action forward to the target group (HTTPS listener can be added when ACM certificate is configured)
9. **ECS Task Execution Role**: IAM role with `AmazonECSTaskExecutionRolePolicy` and permissions to pull from ECR and write to CloudWatch Logs
10. **ECS Task Definition**: Fargate, references the task execution role, container definition as described in `ecs-task-definition.json` section above
11. **ECS Service**: launch type `FARGATE`, desired count from parameter, network configuration using the provided subnets and ECS task security group, assign public IP enabled, load balancer configuration pointing to the ALB target group, depends on the ALB listener

**Outputs**:
- `AlbDnsName` — the ALB's DNS name (the application URL)
- `EcsClusterArn` — the cluster ARN
- `EcsServiceArn` — the service ARN
- `EcrRepositoryUri` — the ECR repository URI
- `LogGroupName` — the CloudWatch log group name

### 3. GitHub Actions workflow

- `.github/workflows/05-aws-ecs-fargate-deploy.yml`

## How to Use This Deployment Model

### First-time setup (one time only)

1. **Create an IAM OIDC identity provider** in your AWS account for GitHub Actions: `token.actions.githubusercontent.com`
2. **Create an IAM role** (`GitHubActionsECSDeployRole`) that trusts the OIDC provider, scoped to your repository `javakishore-veleti/ITProsWordADay`, with permissions for ECR push, ECS deploy, CloudFormation create/update, and CloudWatch
3. **Add all required secrets** listed in "GitHub Actions Secrets Required" to the GitHub repository
4. **Run workflow 05** with action `infrastructure` to create the CloudFormation stack
5. **Run workflow 05** with action `build-and-deploy` to build/push the Docker image and deploy to ECS

### Subsequent deployments (after code changes)

1. Push code changes to GitHub
2. Manually run workflow **05** with action `build-and-deploy`
3. The ALB health check on `/api/health` confirms the new deployment is healthy

### Verification

- Access the application via the ALB DNS name output from the CloudFormation stack
- Check container logs: `aws logs tail /ecs/itpros-wordaday --follow`
- Check ECS service status: `aws ecs describe-services --cluster itpros-wordaday-cluster --services itpros-wordaday-service`

## Comparison of All Deployment Models

| Aspect | GitHub Pages | AWS ECS Fargate | AWS Blue/Green EC2 |
|---|---|---|---|
| **Backend** | None (static fallback) | Go in container | Go binary on EC2 |
| **Compute** | N/A (CDN) | Fargate (serverless) | EC2 in ASG |
| **Deploy strategy** | Overwrite static files | Rolling update | Blue/Green (zero-downtime) |
| **Rollback** | Re-run workflow 03 | ECS rolls back task | CodeDeploy auto-rollback |
| **Storage** | Static JSON in build | In-container JSON files | Amazon EFS (shared, persistent) |
| **Scaling** | N/A | ECS auto-scaling | EC2 Auto Scaling Group |
| **Cost** | Free | ~$15-30/month | ~$10-25/month (t3.micro) |
| **Config mgmt** | Env vars at build time | ECS task definition env | SSM Parameter Store |
| **Logging** | Browser console | CloudWatch (awslogs) | CloudWatch (agent) |
| **Lifecycle hooks** | None | ALB health check | Lambda + CodeDeploy hooks |
| **Workflows** | 03 | 05 | 06 |

## Important Constraints

- All workflows are **manually triggered** — no automatic deployments on push
- The Dockerfile at the repo root is the **single source of truth** for the container image — do not create a separate Dockerfile for AWS
- The Go backend must detect `DEPLOYMENT_MODE=aws` and behave accordingly (use Redis if enabled, use AWS-native services if configured)
- The container exposes only port **8080** — the ALB handles HTTP (80) and HTTPS (443) termination
- No user data is stored — the application is stateless, so ECS tasks can be replaced freely
- CloudFormation manages infrastructure as code — never create AWS resources manually outside the stack

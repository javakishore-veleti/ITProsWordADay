# AWS Deployment Configurations — Complete Setup Guide

This guide walks you through **every configuration step** required before running the AWS deployment workflows (05 and 06). Follow the sections in order.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Choose Your AWS Region](#2-choose-your-aws-region)
3. [Step-by-Step: Set Up OIDC Authentication (GitHub → AWS)](#3-step-by-step-set-up-oidc-authentication-github--aws)
4. [Step-by-Step: Create AWS Resources for ECS Fargate (Workflow 05)](#4-step-by-step-create-aws-resources-for-ecs-fargate-workflow-05)
5. [Step-by-Step: Create AWS Resources for Blue/Green EC2 (Workflow 06)](#5-step-by-step-create-aws-resources-for-bluegreen-ec2-workflow-06)
6. [Step-by-Step: Add Secrets to GitHub Repository](#6-step-by-step-add-secrets-to-github-repository)
7. [Complete Secrets Reference (All Models)](#7-complete-secrets-reference-all-models)
8. [IAM Policy Limit Workaround](#8-iam-policy-limit-workaround)
9. [Verification Checklist](#9-verification-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- [ ] An **AWS account** with admin or sufficient IAM permissions
- [ ] **AWS CLI v2** installed and configured locally (`aws --version`)
- [ ] **GitHub repository** with admin access (required to add secrets)
- [ ] **GitHub CLI** (`gh`) installed and authenticated (`gh auth login`)
- [ ] Decide which deployment model(s) you will use:
  - **Workflow 05** — ECS Fargate (serverless containers)
  - **Workflow 06** — Blue/Green EC2 (Auto Scaling Group + CodeDeploy)
  - Or both

---

## 2. Choose Your AWS Region

Pick the region closest to your users. All resources must be in the **same region**.

| Region Code | Location |
|---|---|
| `us-east-1` | N. Virginia |
| `us-west-2` | Oregon |
| `eu-west-1` | Ireland |
| `eu-west-2` | London |
| `ap-south-1` | Mumbai |
| `ap-southeast-1` | Singapore |

Note your chosen region — it will be your `AWS_REGION` secret value.

---

## 3. Step-by-Step: Set Up OIDC Authentication (GitHub → AWS)

This is **required for both workflows**. It allows GitHub Actions to assume an AWS IAM role without storing any AWS access keys.

### 3.1 Create the OIDC Identity Provider in AWS

**AWS Console method:**

1. Go to **IAM** → **Identity Providers** → **Add provider**
2. Provider type: **OpenID Connect**
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Click **Get thumbprint**
5. Audience: `sts.amazonaws.com`
6. Click **Add provider**

**AWS CLI method:**

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

> The thumbprint may change over time. The console method auto-retrieves the current one.

### 3.2 Create the IAM Role for GitHub Actions

**AWS Console method (recommended):**

1. Go to **IAM** → **Roles** → **Create role**
2. Trusted entity type: **Web identity**
3. Identity provider: `token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. GitHub organization: `<YOUR_GITHUB_USERNAME_OR_ORG>`
6. GitHub repository: `<YOUR_REPO_NAME>` (restrict to this specific repo for security)
7. GitHub branch: `*`
8. Click **Next**
9. See Section 3.3 for permissions, or select `AdministratorAccess` (see Section 8 for why)
10. Click **Next**
11. Role name: `<YOUR_ROLE_NAME>` (e.g., `GitHubActionsDeployRole<ProjectName>`)
12. Click **Create role**

**AWS CLI method:**

Create the trust policy file (`github-actions-trust-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<YOUR_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_USERNAME_OR_ORG>/<YOUR_REPO_NAME>:*"
        }
      }
    }
  ]
}
```

> Find your account ID: `aws sts get-caller-identity --query Account --output text`

Create the role:

```bash
aws iam create-role \
  --role-name <YOUR_ROLE_NAME> \
  --assume-role-policy-document file://github-actions-trust-policy.json \
  --description "GitHub Actions OIDC role for deployments"
```

**Note the Role ARN** from the output:

```
arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_ROLE_NAME>
```

This is your `AWS_IAM_ROLE_ARN` secret value.

### 3.3 Attach Permissions to the Role

> **Important**: AWS IAM has a limit of **10 managed policies per role**. If you need both workflows (13 policies total), see Section 8 for workarounds.

**If using Workflow 05 only (ECS Fargate) — 6 policies:**

```bash
aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

**If using Workflow 06 only (Blue/Green EC2) — add these 7 on top:**

```bash
aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonElasticFileSystemFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess

aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AutoScalingFullAccess
```

---

## 4. Step-by-Step: Create AWS Resources for ECS Fargate (Workflow 05)

### Option A: Let CloudFormation Create Everything (Recommended)

Running Workflow 05 with action `infrastructure` creates the ECR repo, ECS cluster, and service via `aws/ecs-fargate/cloudformation.yml`. You only need to choose names for the secrets:

| What to Create | Secret Name | Description |
|---|---|---|
| ECR Repository | `AWS_ECR_REPOSITORY` | Name for the Docker image registry |
| ECS Cluster | `AWS_ECS_CLUSTER` | Name for the ECS cluster |
| ECS Service | `AWS_ECS_SERVICE` | Name for the ECS service |

These names must match what's in the CloudFormation template. The defaults in the template are: `itpros-wordaday`, `itpros-wordaday-cluster`, `itpros-wordaday-service`.

### Option B: Create Resources Manually (If You Want Control)

**4.1 Create an ECR Repository:**

```bash
aws ecr create-repository \
  --repository-name <YOUR_ECR_REPO_NAME> \
  --region <YOUR_REGION> \
  --image-scanning-configuration scanOnPush=true
```

**4.2 Create an ECS Cluster:**

```bash
aws ecs create-cluster \
  --cluster-name <YOUR_ECS_CLUSTER_NAME> \
  --region <YOUR_REGION> \
  --settings name=containerInsights,value=enabled
```

**4.3 The ECS Service and Task Definition** are created by the workflow's deploy job.

---

## 5. Step-by-Step: Create AWS Resources for Blue/Green EC2 (Workflow 06)

### Option A: Let CloudFormation Create Everything (Recommended)

Running Workflow 06 with action `infrastructure` creates VPC, subnets, ALB, ASG, CodeDeploy, EFS, S3 bucket, Lambda, and SSM parameters via `aws/blue-green/cloudformation.yml`.

### Option B: Create Resources Manually

**5.1 Create an S3 Bucket** for deployment artifacts:

```bash
aws s3 mb s3://<YOUR_BUCKET_NAME> --region <YOUR_REGION>
```

**5.2 CodeDeploy** — created by CloudFormation. Note the names used in the template for:
- `AWS_CODEDEPLOY_APP`
- `AWS_CODEDEPLOY_GROUP`

**5.3 Auto Scaling Group** — created by CloudFormation. Note the name for `AWS_ASG_NAME`.

**5.4 EC2 Key Pair** (optional, for SSH access to Bastion):

```bash
aws ec2 create-key-pair \
  --key-name <YOUR_KEY_NAME> \
  --region <YOUR_REGION> \
  --query 'KeyMaterial' --output text > <YOUR_KEY_NAME>.pem

chmod 400 <YOUR_KEY_NAME>.pem
```

Keep the `.pem` file safe — you'll need it for SSH.

**5.5 Find Your Public IP** (for Bastion SSH access):

```bash
curl -s https://checkip.amazonaws.com
```

Append `/32` to make it a CIDR (e.g., `x.x.x.x/32`) → `AWS_BASTION_ALLOWED_CIDR`

---

## 6. Step-by-Step: Add Secrets to GitHub Repository

### 6.1 Via GitHub Web UI

1. Go to your GitHub repository
2. Click **Settings** (top tab, requires admin access)
3. In the left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. For each secret:
   - **Name**: Enter the secret name exactly (e.g., `AWS_IAM_ROLE_ARN`)
   - **Secret**: Enter the value
   - Click **Add secret**
6. Repeat for every secret

### 6.2 Via GitHub CLI (Faster)

```bash
# Shared authentication secrets (required for both workflows)
gh secret set AWS_IAM_ROLE_ARN --body "<YOUR_ROLE_ARN>"
gh secret set AWS_REGION --body "<YOUR_REGION>"

# Workflow 05 (ECS Fargate) secrets
gh secret set AWS_ECR_REPOSITORY --body "<YOUR_ECR_REPO_NAME>"
gh secret set AWS_ECS_CLUSTER --body "<YOUR_ECS_CLUSTER_NAME>"
gh secret set AWS_ECS_SERVICE --body "<YOUR_ECS_SERVICE_NAME>"

# Workflow 06 (Blue/Green EC2) secrets — only if using this model
gh secret set AWS_S3_ARTIFACT_BUCKET --body "<YOUR_S3_BUCKET_NAME>"
gh secret set AWS_CODEDEPLOY_APP --body "<YOUR_CODEDEPLOY_APP_NAME>"
gh secret set AWS_CODEDEPLOY_GROUP --body "<YOUR_CODEDEPLOY_GROUP_NAME>"
gh secret set AWS_ASG_NAME --body "<YOUR_ASG_NAME>"
gh secret set AWS_KEYPAIR_NAME --body "<YOUR_KEY_PAIR_NAME>"
gh secret set AWS_BASTION_ALLOWED_CIDR --body "<YOUR_IP>/32"
```

### 6.3 Verify Secrets Were Added

```bash
gh secret list
```

Or go to **Settings → Secrets and variables → Actions** in the GitHub web UI.

---

## 7. Complete Secrets Reference (All Models)

### Shared Secrets (Both Workflows)

| # | Secret Name | Description | How to Get the Value |
|---|---|---|---|
| 1 | `AWS_IAM_ROLE_ARN` | IAM role ARN for OIDC federation | Created in Section 3.2 — copy from IAM role summary page |
| 2 | `AWS_REGION` | AWS region for all resources | Chosen in Section 2 (e.g., `us-east-1`) |

### Workflow 05 Secrets (ECS Fargate)

| # | Secret Name | Description | How to Get the Value |
|---|---|---|---|
| 3 | `AWS_ECR_REPOSITORY` | ECR repository name | Choose a name; must match CloudFormation template |
| 4 | `AWS_ECS_CLUSTER` | ECS cluster name | Choose a name; must match CloudFormation template |
| 5 | `AWS_ECS_SERVICE` | ECS service name | Choose a name; must match CloudFormation template |

### Workflow 06 Secrets (Blue/Green EC2)

| # | Secret Name | Description | How to Get the Value |
|---|---|---|---|
| 6 | `AWS_S3_ARTIFACT_BUCKET` | S3 bucket for deploy artifacts | CloudFormation output `S3ArtifactBucket` or manually created |
| 7 | `AWS_CODEDEPLOY_APP` | CodeDeploy application name | CloudFormation output `CodeDeployAppName` |
| 8 | `AWS_CODEDEPLOY_GROUP` | CodeDeploy deployment group | CloudFormation output `CodeDeployGroupName` |
| 9 | `AWS_ASG_NAME` | Auto Scaling Group name | CloudFormation output `AutoScalingGroupName` |
| 10 | `AWS_KEYPAIR_NAME` | EC2 key pair name (optional) | Created in Section 5.4 |
| 11 | `AWS_BASTION_ALLOWED_CIDR` | Your IP CIDR for SSH | `curl checkip.amazonaws.com` then append `/32` |

### Chicken-and-Egg: Secrets Needed Before vs After CloudFormation

**Before running `infrastructure` (must set manually):**
- `AWS_IAM_ROLE_ARN` — created in Section 3
- `AWS_REGION` — chosen by you
- `AWS_ECR_REPOSITORY` — choose the name (CloudFormation creates the resource)
- `AWS_ECS_CLUSTER` — choose the name (CloudFormation creates the resource)
- `AWS_ECS_SERVICE` — choose the name (CloudFormation creates the resource)
- `AWS_KEYPAIR_NAME` — create the key pair first (Section 5.4)
- `AWS_BASTION_ALLOWED_CIDR` — your IP

**After running `infrastructure` (update from CloudFormation outputs):**
- `AWS_S3_ARTIFACT_BUCKET` — from stack output
- `AWS_CODEDEPLOY_APP` — from stack output
- `AWS_CODEDEPLOY_GROUP` — from stack output
- `AWS_ASG_NAME` — from stack output

To get CloudFormation outputs after running the infrastructure job:

```bash
# ECS Fargate stack
aws cloudformation describe-stacks \
  --stack-name itpros-wordaday-ecs-stack \
  --query 'Stacks[0].Outputs' --output table

# Blue/Green EC2 stack
aws cloudformation describe-stacks \
  --stack-name itpros-wordaday-bg-stack \
  --query 'Stacks[0].Outputs' --output table
```

---

## 8. IAM Policy Limit Workaround

AWS IAM has a **limit of 10 managed policies per role**. If you need both deployment models, you need 13 policies which exceeds this limit.

### Option A: Use AdministratorAccess (Quick Start)

Attach a single `AdministratorAccess` managed policy. This grants full access to all AWS services. Use this to get started quickly, then scope down later.

```bash
aws iam attach-role-policy --role-name <YOUR_ROLE_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Option B: Use a Custom Inline Policy (More Secure)

Create the role with no managed policies, then add a single inline policy that combines all permissions:

```bash
aws iam put-role-policy \
  --role-name <YOUR_ROLE_NAME> \
  --policy-name GitHubActionsFullDeployPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecs:*", "ecr:*", "elasticloadbalancing:*",
          "logs:*", "cloudformation:*", "iam:*",
          "ec2:*", "codedeploy:*", "s3:*",
          "elasticfilesystem:*", "lambda:*", "ssm:*",
          "autoscaling:*", "sts:GetCallerIdentity"
        ],
        "Resource": "*"
      }
    ]
  }'
```

Inline policies don't count toward the 10-managed-policy limit.

### Option C: Two Separate Roles

Create one role per deployment model, each under the 10-policy limit:
- `GitHubActionsECSRole` — 6 ECS Fargate policies → `AWS_IAM_ROLE_ARN` for workflow 05
- `GitHubActionsEC2Role` — 10 Blue/Green EC2 policies → a separate secret for workflow 06

This requires modifying workflow 06 to use a different secret name for the role ARN.

---

## 9. Verification Checklist

### After Adding All Secrets

- [ ] Run `gh secret list` and confirm all required secrets are listed
- [ ] Run **Workflow 05** with action `infrastructure` — should pass preflight and attempt CloudFormation
- [ ] Run **Workflow 06** with action `infrastructure` — same

### After Running Infrastructure

- [ ] CloudFormation stacks show `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] Verify: `aws cloudformation describe-stacks --stack-name <STACK_NAME> --query 'Stacks[0].StackStatus'`
- [ ] Update any secrets that reference CloudFormation outputs (Section 7)
- [ ] Run the `build-and-deploy` action for your chosen workflow

### After First Deployment

- [ ] Access the app via the ALB DNS name from CloudFormation outputs
- [ ] Verify health endpoint: `curl http://<ALB_DNS>/api/health`
- [ ] Check logs: `aws logs tail /ecs/itpros-wordaday --follow` (Fargate) or `aws logs tail /ec2/itpros-wordaday --follow` (EC2)

---

## 10. Troubleshooting

### Error: "Input required and not supplied: aws-region"

**Cause**: `AWS_REGION` secret is missing or empty.
**Fix**: Add the `AWS_REGION` secret in GitHub (Section 6).

### Error: "Missing required GitHub Actions secrets: ..."

**Cause**: The preflight check found missing secrets.
**Fix**: Add all listed secrets (Section 6). The error message tells you exactly which ones are missing.

### Error: "Not authorized to perform: sts:AssumeRoleWithWebIdentity"

**Cause**: The OIDC identity provider or trust policy is misconfigured.
**Fix**:
1. Verify the OIDC provider exists: `aws iam list-open-id-connect-providers`
2. Verify the trust policy: `aws iam get-role --role-name <YOUR_ROLE_NAME> --query 'Role.AssumeRolePolicyDocument'`
3. Ensure the `sub` condition includes your repository

### Error: "AccessDenied" on any AWS API call

**Cause**: The IAM role lacks the required policy.
**Fix**: Attach the missing policy (Section 3.3) or use `AdministratorAccess` (Section 8). Check which API failed in the workflow log.

### Error: "Repository does not exist" (ECR)

**Cause**: ECR repository hasn't been created yet.
**Fix**: Run workflow 05 with action `infrastructure` first, or create it manually (Section 4).

### Error: "Cluster not found" (ECS)

**Cause**: ECS cluster hasn't been created yet.
**Fix**: Run workflow 05 with action `infrastructure` first.

### Error: "Number of policies to be attached exceeds the limit"

**Cause**: AWS IAM allows max 10 managed policies per role.
**Fix**: See Section 8 for workarounds (AdministratorAccess, inline policy, or two separate roles).

### CloudFormation stack in ROLLBACK_COMPLETE state

**Cause**: Stack creation failed and rolled back.
**Fix**: Delete the failed stack and re-run:

```bash
aws cloudformation delete-stack --stack-name <STACK_NAME>
aws cloudformation wait stack-delete-complete --stack-name <STACK_NAME>
```

Then re-run the workflow with action `infrastructure`.

---

## Quick Start Summary

For the fastest path to a running deployment:

### ECS Fargate (Workflow 05)

```bash
# 1. Create OIDC provider (Section 3.1) — one time
# 2. Create IAM role (Section 3.2) — one time
# 3. Add secrets:
gh secret set AWS_IAM_ROLE_ARN --body "<YOUR_ROLE_ARN>"
gh secret set AWS_REGION --body "<YOUR_REGION>"
gh secret set AWS_ECR_REPOSITORY --body "<YOUR_ECR_REPO_NAME>"
gh secret set AWS_ECS_CLUSTER --body "<YOUR_ECS_CLUSTER_NAME>"
gh secret set AWS_ECS_SERVICE --body "<YOUR_ECS_SERVICE_NAME>"
# 4. Run workflow 05: action = "full (infrastructure + build + deploy)"
```

### Blue/Green EC2 (Workflow 06)

```bash
# 1. Same OIDC + IAM role from above (shared)
# 2. Create key pair (Section 5.4) — optional
# 3. Add secrets:
gh secret set AWS_S3_ARTIFACT_BUCKET --body "<YOUR_S3_BUCKET_NAME>"
gh secret set AWS_CODEDEPLOY_APP --body "<YOUR_CODEDEPLOY_APP_NAME>"
gh secret set AWS_CODEDEPLOY_GROUP --body "<YOUR_CODEDEPLOY_GROUP_NAME>"
gh secret set AWS_ASG_NAME --body "<YOUR_ASG_NAME>"
gh secret set AWS_KEYPAIR_NAME --body "<YOUR_KEY_PAIR_NAME>"
gh secret set AWS_BASTION_ALLOWED_CIDR --body "<YOUR_IP>/32"
# 4. Run workflow 06: action = "full (infrastructure + build + deploy)"
```

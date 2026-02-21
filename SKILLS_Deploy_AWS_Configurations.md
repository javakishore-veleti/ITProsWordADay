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
8. [Verification Checklist](#8-verification-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- [ ] An **AWS account** with admin or sufficient IAM permissions
- [ ] **AWS CLI v2** installed and configured locally (`aws --version`)
- [ ] **GitHub repository**: `javakishore-veleti/ITProsWordADay`
- [ ] **GitHub admin access** to the repository (required to add secrets)
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

For this guide, we use `eu-west-2` (London). Replace with your chosen region throughout.

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

**3.2.1 Create the trust policy file** (`github-actions-trust-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
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

> Replace `ACCOUNT_ID` with your 12-digit AWS account ID. Find it by running: `aws sts get-caller-identity --query Account --output text`

**3.2.2 Create the role:**

```bash
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json \
  --description "Role for GitHub Actions OIDC - ITProsWordADay deployments"
```

**3.2.3 Note the Role ARN** from the output — it will look like:

```
arn:aws:iam::123456789012:role/GitHubActionsDeployRole
```

This is your `AWS_IAM_ROLE_ARN` secret value.

### 3.3 Attach Permissions to the Role

The permissions needed depend on which workflow(s) you plan to use.

**If using Workflow 05 only (ECS Fargate):**

```bash
aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

**If using Workflow 06 only (Blue/Green EC2) — add these on top:**

```bash
aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonElasticFileSystemFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess

aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AutoScalingFullAccess
```

**If using both workflows** — attach all policies listed above.

---

## 4. Step-by-Step: Create AWS Resources for ECS Fargate (Workflow 05)

### Option A: Let CloudFormation Create Everything (Recommended)

If you run Workflow 05 with action `infrastructure`, it creates the ECR repo, ECS cluster, and service for you. You only need these initial values:

| What to Create | How | Value for Secret |
|---|---|---|
| ECR Repository Name | Choose a name | `itpros-wordaday` |
| ECS Cluster Name | Choose a name | `itpros-wordaday-cluster` |
| ECS Service Name | Choose a name | `itpros-wordaday-service` |

These names are hardcoded in the CloudFormation template. Simply use the values above.

### Option B: Create Resources Manually (If You Want Control)

**4.1 Create an ECR Repository:**

```bash
aws ecr create-repository \
  --repository-name itpros-wordaday \
  --region eu-west-2 \
  --image-scanning-configuration scanOnPush=true
```

Note the repository name: `itpros-wordaday` → this is your `AWS_ECR_REPOSITORY` value.

**4.2 Create an ECS Cluster:**

```bash
aws ecs create-cluster \
  --cluster-name itpros-wordaday-cluster \
  --region eu-west-2 \
  --settings name=containerInsights,value=enabled
```

Note the cluster name: `itpros-wordaday-cluster` → this is your `AWS_ECS_CLUSTER` value.

**4.3 The ECS Service and Task Definition** are created by the workflow's deploy job. Use the planned name: `itpros-wordaday-service` → this is your `AWS_ECS_SERVICE` value.

### Summary of Secrets for Workflow 05

| Secret Name | Where It Comes From | Value |
|---|---|---|
| `AWS_IAM_ROLE_ARN` | Section 3.2 above | `arn:aws:iam::123456789012:role/GitHubActionsDeployRole` |
| `AWS_REGION` | Section 2 above | `eu-west-2` |
| `AWS_ECR_REPOSITORY` | ECR repo name | `itpros-wordaday` |
| `AWS_ECS_CLUSTER` | ECS cluster name | `itpros-wordaday-cluster` |
| `AWS_ECS_SERVICE` | ECS service name | `itpros-wordaday-service` |

---

## 5. Step-by-Step: Create AWS Resources for Blue/Green EC2 (Workflow 06)

### Option A: Let CloudFormation Create Everything (Recommended)

Running Workflow 06 with action `infrastructure` creates the VPC, subnets, ALB, ASG, CodeDeploy app/group, EFS, S3 bucket, Lambda, and SSM parameters via `aws/blue-green/cloudformation.yml`.

The CloudFormation template generates these resources with known names. Use the default values below.

### Option B: Create Resources Manually

**5.1 Create an S3 Bucket** for deployment artifacts:

```bash
aws s3 mb s3://itpros-wordaday-deploy-artifacts-$(aws sts get-caller-identity --query Account --output text) \
  --region eu-west-2
```

Note the bucket name → this is your `AWS_S3_ARTIFACT_BUCKET` value.

**5.2 CodeDeploy** — created by CloudFormation. Use defaults:
- Application name: `itpros-wordaday-app` → `AWS_CODEDEPLOY_APP`
- Deployment group: `itpros-wordaday-bg-group` → `AWS_CODEDEPLOY_GROUP`

**5.3 Auto Scaling Group** — created by CloudFormation. Use default:
- ASG name: `itpros-wordaday-asg` → `AWS_ASG_NAME`

**5.4 EC2 Key Pair** (optional, for SSH access to Bastion):

```bash
aws ec2 create-key-pair \
  --key-name itpros-wordaday-key \
  --region eu-west-2 \
  --query 'KeyMaterial' --output text > itpros-wordaday-key.pem

chmod 400 itpros-wordaday-key.pem
```

Note: `itpros-wordaday-key` → `AWS_KEYPAIR_NAME`. Keep the `.pem` file safe.

**5.5 Find Your Public IP** (for Bastion SSH access):

```bash
curl -s https://checkip.amazonaws.com
```

Append `/32` to make it a CIDR: e.g., `203.0.113.42/32` → `AWS_BASTION_ALLOWED_CIDR`

### Summary of Secrets for Workflow 06

| Secret Name | Where It Comes From | Value |
|---|---|---|
| `AWS_IAM_ROLE_ARN` | Section 3.2 (shared) | `arn:aws:iam::123456789012:role/GitHubActionsDeployRole` |
| `AWS_REGION` | Section 2 (shared) | `eu-west-2` |
| `AWS_S3_ARTIFACT_BUCKET` | S3 bucket name or CloudFormation output | `itpros-wordaday-artifacts-123456789012` |
| `AWS_CODEDEPLOY_APP` | CloudFormation creates it | `itpros-wordaday-app` |
| `AWS_CODEDEPLOY_GROUP` | CloudFormation creates it | `itpros-wordaday-bg-group` |
| `AWS_ASG_NAME` | CloudFormation creates it | `itpros-wordaday-asg` |
| `AWS_KEYPAIR_NAME` | Optional, from step 5.4 | `itpros-wordaday-key` |
| `AWS_BASTION_ALLOWED_CIDR` | Your IP from step 5.5 | `203.0.113.42/32` |

---

## 6. Step-by-Step: Add Secrets to GitHub Repository

### 6.1 Via GitHub Web UI (Recommended)

1. Go to **https://github.com/javakishore-veleti/ITProsWordADay**
2. Click **Settings** (top tab, requires admin access)
3. In the left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. For each secret:
   - **Name**: Enter the secret name exactly (e.g., `AWS_IAM_ROLE_ARN`)
   - **Secret**: Enter the value (e.g., `arn:aws:iam::123456789012:role/GitHubActionsDeployRole`)
   - Click **Add secret**
6. Repeat for every secret listed below

### 6.2 Via GitHub CLI (Faster)

If you have `gh` CLI installed:

```bash
# Shared authentication secrets (required for both workflows)
gh secret set AWS_IAM_ROLE_ARN --body "arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsDeployRole"
gh secret set AWS_REGION --body "eu-west-2"

# Workflow 05 (ECS Fargate) secrets
gh secret set AWS_ECR_REPOSITORY --body "itpros-wordaday"
gh secret set AWS_ECS_CLUSTER --body "itpros-wordaday-cluster"
gh secret set AWS_ECS_SERVICE --body "itpros-wordaday-service"

# Workflow 06 (Blue/Green EC2) secrets
gh secret set AWS_S3_ARTIFACT_BUCKET --body "itpros-wordaday-artifacts-YOUR_ACCOUNT_ID"
gh secret set AWS_CODEDEPLOY_APP --body "itpros-wordaday-app"
gh secret set AWS_CODEDEPLOY_GROUP --body "itpros-wordaday-bg-group"
gh secret set AWS_ASG_NAME --body "itpros-wordaday-asg"
gh secret set AWS_KEYPAIR_NAME --body "itpros-wordaday-key"
gh secret set AWS_BASTION_ALLOWED_CIDR --body "YOUR_IP/32"
```

> Replace `YOUR_ACCOUNT_ID` and `YOUR_IP` with your actual values.

### 6.3 Verify Secrets Were Added

Go to **Settings → Secrets and variables → Actions**. You should see a list of all added secrets (values are hidden, but names are visible).

---

## 7. Complete Secrets Reference (All Models)

### Shared Secrets (Both Workflows)

| # | Secret Name | Description | How to Get the Value | Example |
|---|---|---|---|---|
| 1 | `AWS_IAM_ROLE_ARN` | IAM role ARN for OIDC | Created in Section 3.2 | `arn:aws:iam::123456789012:role/GitHubActionsDeployRole` |
| 2 | `AWS_REGION` | AWS region | Chosen in Section 2 | `eu-west-2` |

### Workflow 05 Secrets (ECS Fargate)

| # | Secret Name | Description | How to Get the Value | Example |
|---|---|---|---|---|
| 3 | `AWS_ECR_REPOSITORY` | ECR repository name | Hardcoded in CloudFormation or manually created | `itpros-wordaday` |
| 4 | `AWS_ECS_CLUSTER` | ECS cluster name | Hardcoded in CloudFormation or manually created | `itpros-wordaday-cluster` |
| 5 | `AWS_ECS_SERVICE` | ECS service name | Hardcoded in CloudFormation or manually created | `itpros-wordaday-service` |

### Workflow 06 Secrets (Blue/Green EC2)

| # | Secret Name | Description | How to Get the Value | Example |
|---|---|---|---|---|
| 6 | `AWS_S3_ARTIFACT_BUCKET` | S3 bucket for deploy artifacts | CloudFormation output `S3ArtifactBucket` | `itpros-wordaday-artifacts-123456789012` |
| 7 | `AWS_CODEDEPLOY_APP` | CodeDeploy application name | CloudFormation output `CodeDeployAppName` | `itpros-wordaday-app` |
| 8 | `AWS_CODEDEPLOY_GROUP` | CodeDeploy deployment group | CloudFormation output `CodeDeployGroupName` | `itpros-wordaday-bg-group` |
| 9 | `AWS_ASG_NAME` | Auto Scaling Group name | CloudFormation output `AutoScalingGroupName` | `itpros-wordaday-asg` |
| 10 | `AWS_KEYPAIR_NAME` | EC2 key pair (optional) | Created in Section 5.4 | `itpros-wordaday-key` |
| 11 | `AWS_BASTION_ALLOWED_CIDR` | Your IP for SSH | `curl checkip.amazonaws.com` + `/32` | `203.0.113.42/32` |

### Chicken-and-Egg: Secrets Needed Before vs After CloudFormation

Some secrets (like `AWS_S3_ARTIFACT_BUCKET`) refer to resources that CloudFormation creates. Here's the resolution:

**Before running `infrastructure` (must set manually):**
- `AWS_IAM_ROLE_ARN` — created in Section 3
- `AWS_REGION` — chosen by you
- `AWS_ECR_REPOSITORY` — choose the name (CloudFormation creates it)
- `AWS_ECS_CLUSTER` — choose the name (CloudFormation creates it)
- `AWS_ECS_SERVICE` — choose the name (CloudFormation creates it)
- `AWS_KEYPAIR_NAME` — create the key pair first (Section 5.4)
- `AWS_BASTION_ALLOWED_CIDR` — your IP

**After running `infrastructure` (update from CloudFormation outputs):**
- `AWS_S3_ARTIFACT_BUCKET` — from stack output
- `AWS_CODEDEPLOY_APP` — from stack output
- `AWS_CODEDEPLOY_GROUP` — from stack output
- `AWS_ASG_NAME` — from stack output

To get CloudFormation outputs after running the infrastructure job:

```bash
aws cloudformation describe-stacks \
  --stack-name itpros-wordaday-ecs-stack \
  --query 'Stacks[0].Outputs' --output table

aws cloudformation describe-stacks \
  --stack-name itpros-wordaday-bg-stack \
  --query 'Stacks[0].Outputs' --output table
```

---

## 8. Verification Checklist

### After Adding All Secrets

- [ ] Go to **repo → Settings → Secrets → Actions** and confirm all secrets are listed
- [ ] Run **Workflow 05** with action `infrastructure` — should pass the preflight check and attempt CloudFormation
- [ ] Run **Workflow 06** with action `infrastructure` — same

### After Running Infrastructure

- [ ] CloudFormation stacks show `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] Run `aws cloudformation describe-stacks --stack-name itpros-wordaday-ecs-stack --query 'Stacks[0].StackStatus'`
- [ ] Update any secrets that reference CloudFormation outputs (Section 7)
- [ ] Run the `build-and-deploy` action for your chosen workflow

### After First Deployment

- [ ] Access the app via the ALB DNS name from CloudFormation outputs
- [ ] Verify health endpoint: `curl http://<ALB_DNS>/api/health`
- [ ] Check logs: `aws logs tail /ecs/itpros-wordaday --follow` (Fargate) or `aws logs tail /ec2/itpros-wordaday --follow` (EC2)

---

## 9. Troubleshooting

### Error: "Input required and not supplied: aws-region"

**Cause**: `AWS_REGION` secret is missing or empty.
**Fix**: Add the `AWS_REGION` secret in GitHub (Section 6).

### Error: "Missing required GitHub Actions secrets: ..."

**Cause**: The preflight check found missing secrets.
**Fix**: Add all listed secrets (Section 6). The error message tells you exactly which ones.

### Error: "Not authorized to perform: sts:AssumeRoleWithWebIdentity"

**Cause**: The OIDC identity provider or trust policy is misconfigured.
**Fix**:
1. Verify the OIDC provider exists: `aws iam list-open-id-connect-providers`
2. Verify the trust policy on the role: `aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.AssumeRolePolicyDocument'`
3. Ensure the `sub` condition includes your repository: `repo:javakishore-veleti/ITProsWordADay:*`

### Error: "AccessDenied" on any AWS API call

**Cause**: The IAM role lacks the required policy.
**Fix**: Attach the missing policy (Section 3.3). Check which API failed in the workflow log and match it to the corresponding AWS managed policy.

### Error: "Repository does not exist" (ECR)

**Cause**: ECR repository hasn't been created yet.
**Fix**: Run workflow 05 with action `infrastructure` first, or create it manually (Section 4).

### Error: "Cluster not found" (ECS)

**Cause**: ECS cluster hasn't been created yet.
**Fix**: Run workflow 05 with action `infrastructure` first.

### CloudFormation stack in ROLLBACK_COMPLETE state

**Cause**: Stack creation failed and rolled back.
**Fix**: Delete the failed stack and re-run:

```bash
aws cloudformation delete-stack --stack-name itpros-wordaday-ecs-stack
aws cloudformation wait stack-delete-complete --stack-name itpros-wordaday-ecs-stack
```

Then re-run the workflow with action `infrastructure`.

---

## Quick Start Summary

For the fastest path to a running deployment:

### ECS Fargate (Workflow 05)

```bash
# 1. Create OIDC provider (Section 3.1) — one time
# 2. Create IAM role (Section 3.2) — one time
# 3. Add secrets via gh CLI:
gh secret set AWS_IAM_ROLE_ARN --body "arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole"
gh secret set AWS_REGION --body "eu-west-2"
gh secret set AWS_ECR_REPOSITORY --body "itpros-wordaday"
gh secret set AWS_ECS_CLUSTER --body "itpros-wordaday-cluster"
gh secret set AWS_ECS_SERVICE --body "itpros-wordaday-service"
# 4. Run workflow 05: action = "full (infrastructure + build + deploy)"
```

### Blue/Green EC2 (Workflow 06)

```bash
# 1. Same OIDC + IAM role from above (shared)
# 2. Create key pair (Section 5.4) — optional
# 3. Add secrets via gh CLI:
gh secret set AWS_S3_ARTIFACT_BUCKET --body "itpros-wordaday-artifacts-ACCOUNT_ID"
gh secret set AWS_CODEDEPLOY_APP --body "itpros-wordaday-app"
gh secret set AWS_CODEDEPLOY_GROUP --body "itpros-wordaday-bg-group"
gh secret set AWS_ASG_NAME --body "itpros-wordaday-asg"
gh secret set AWS_KEYPAIR_NAME --body "itpros-wordaday-key"
gh secret set AWS_BASTION_ALLOWED_CIDR --body "YOUR_IP/32"
# 4. Run workflow 06: action = "full (infrastructure + build + deploy)"
```

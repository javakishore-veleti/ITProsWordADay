# AWS Blue/Green EC2 Deployment Model

## Deployment Model ID
`aws-blue-green-ec2`

## Overview
This is one of multiple deployment models for the IT Pros WordADay application. This model deploys the Go backend + Next.js frontend to EC2 instances in an Auto Scaling Group (ASG) using a **Blue/Green deployment strategy** via AWS CodeDeploy. An Application Load Balancer (ALB) routes end-user traffic. Amazon EFS provides shared persistent storage for word JSON files across all instances. AWS Lambda handles deployment lifecycle hooks and SSM Parameter Store manages runtime configuration. All CI/CD is driven by manually-triggered GitHub Actions workflows.

See also:
- `SKILLS_Deploy_GitHub_Pages.md` — static-only deployment to GitHub Pages
- `SKILLS_Deploy_AWS_ECS_Fargate.md` — serverless container deployment to ECS Fargate

## Architecture Diagram Reference
```
┌──────────────── Deployment Pipeline ────────────────────────────────────┐
│                                                                         │
│  ① Developer                                                           │
│      │                                                                  │
│      ▼                                                                  │
│  ② GitHub Actions ──▶ CodeBuild ──▶ ④ CodeDeploy ──▶ ⑥ Lambda         │
│     (Source)           (Build)        (B/G Deploy)     (Hooks)          │
│                                                           │             │
│                                                           ▼             │
│                                                     ⑦ SSM Parameter    │
│                                                        Store           │
└─────────────────────────────────────────────────────────────────────────┘
        │
        │  ③ B/G Deployment
        ▼
┌──────────────── Application Stack ──────────────────────────────────────┐
│                                                                         │
│  End Users ──▶ AWS ALB ──▶ Auto Scaling Group                          │
│                               ┌──────────┐    ┌──────────┐            │
│                               │   Blue   │    │  Green   │            │
│                               │ (current)│    │  (new)   │            │
│                               └────┬─────┘    └────┬─────┘            │
│                                    │                │                   │
│                                    └──────┬─────────┘                   │
│                                           ▼                             │
│                                    ③ Amazon EFS                        │
│                                    (Shared Storage)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Deployment Flow (Step by Step)

1. **Developer triggers** a GitHub Actions workflow manually (`workflow_dispatch`)
2. **GitHub Actions** authenticates to AWS using OIDC federation (see "GitHub Actions to AWS Authentication" section below)
3. **CodeBuild** (triggered via GitHub Actions) builds the Go binary and Next.js static export, packages them into a deployment bundle (zip artifact), and uploads the artifact to S3
4. **CodeDeploy** initiates a Blue/Green deployment:
   - Provisions new EC2 instances (Green fleet) in the Auto Scaling Group
   - Installs the application on the Green fleet using the `appspec.yml` lifecycle hooks
   - Green instances mount the **Amazon EFS** file system to access shared word JSON data files
5. **Lambda deployment hooks** execute:
   - `AfterInstall` — validates the application is installed correctly on Green instances
   - `AfterAllowTraffic` — hits `/api/health` to confirm the Green fleet is serving traffic correctly
   - Lambda reads/writes deployment metadata to **SSM Parameter Store** (current version, rollback info, deployment timestamp)
6. **ALB** switches traffic from Blue (old) to Green (new) fleet
7. After a configurable wait period, the Blue fleet is terminated
8. If any hook fails, CodeDeploy **automatically rolls back** to the Blue fleet

## AWS Services Used

| AWS Service | Purpose |
|---|---|
| **EC2** | Compute instances running the Go backend + static frontend |
| **Auto Scaling Group** | Manages Blue and Green EC2 instance fleets, handles scaling policies |
| **ALB** (Application Load Balancer) | Routes end-user HTTP/HTTPS traffic, switches between Blue/Green target groups |
| **CodeBuild** | Builds the Go binary and Next.js static export, creates the deployment artifact |
| **CodeDeploy** | Orchestrates Blue/Green deployment, manages traffic shifting and rollback |
| **Amazon EFS** (Elastic File System) | Shared persistent NFS storage for word JSON files, mounted on all EC2 instances |
| **Lambda** | Deployment lifecycle hooks (validation, health checks, SSM updates) |
| **SSM Parameter Store** | Stores runtime configuration (deployment version, feature flags, Redis endpoint) |
| **S3** | Stores CodeDeploy deployment artifacts (zip bundles) |
| **CloudWatch Logs** | Centralized logging from EC2 instances via CloudWatch agent |
| **IAM** | Roles for EC2 instance profile, CodeDeploy service, Lambda execution, GitHub Actions OIDC |

## GitHub Actions to AWS Authentication

GitHub Actions workflows authenticate to AWS using **[aws-actions/configure-aws-credentials@v6](https://github.com/aws-actions/configure-aws-credentials)** with OIDC federation. **No AWS access keys or secrets are stored in GitHub.** The action uses GitHub's built-in OIDC provider to obtain short-lived temporary credentials for each workflow run.

### How It Works

1. The workflow declares `permissions: id-token: write` to enable GitHub's OIDC provider
2. `aws-actions/configure-aws-credentials@v6` requests a JWT from GitHub's OIDC endpoint (`token.actions.githubusercontent.com`)
3. The action calls AWS STS `AssumeRoleWithWebIdentity`, passing the JWT and the IAM role ARN
4. AWS STS verifies the JWT against the registered GitHub OIDC identity provider
5. AWS returns temporary credentials (access key, secret key, session token) valid only for that workflow run
6. All subsequent AWS CLI and SDK calls use these temporary credentials automatically

### Required GitHub Actions Secrets

Only **two secrets** are needed — no AWS access keys:

| Secret Name | Description | Example |
|---|---|---|
| `AWS_REGION` | AWS region for all resources | `eu-west-2` |
| `AWS_IAM_ROLE_ARN` | ARN of the IAM role that GitHub Actions assumes via OIDC | `arn:aws:iam::123456789012:role/GitHubActionsDeployRole` |

### One-Time AWS Setup for OIDC Federation

Reference: [aws-actions/configure-aws-credentials — OIDC Configuration](https://github.com/aws-actions/configure-aws-credentials#oidc-configuration)

Before any GitHub Actions workflow can authenticate to AWS, perform these steps once:

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

For this Blue/Green EC2 model:
- `AmazonEC2FullAccess` (or scoped EC2 permissions)
- `AWSCodeBuildAdminAccess`
- `AWSCodeDeployFullAccess`
- `AmazonS3FullAccess` (for deployment artifacts)
- `AmazonElasticFileSystemFullAccess`
- `AWSLambda_FullAccess`
- `AmazonSSMFullAccess`
- `ElasticLoadBalancingFullAccess`
- `AutoScalingFullAccess`
- `CloudWatchLogsFullAccess`
- `AWSCloudFormationFullAccess`
- `IAMFullAccess` (to create service roles — can be scoped down)

**Step 4: Store the Role ARN in GitHub Actions Secrets**

Go to GitHub repo > Settings > Secrets and variables > Actions, then add:
- `AWS_IAM_ROLE_ARN` = `arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsDeployRole`
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

---

## VPC Network Architecture

The CloudFormation template creates the following VPC layout across 2 Availability Zones:

```
┌─────────────────────────── VPC: 10.0.0.0/16 ────────────────────────────┐
│  Region: eu-west-2                                                       │
│                                                                          │
│          AZ: eu-west-2a                    AZ: eu-west-2b               │
│  ┌──────────────────────┐          ┌──────────────────────┐             │
│  │ Public: 10.0.0.0/20  │          │ Public: 10.0.48.0/20 │             │
│  │  ┌──────────────┐    │          │  ┌────────────────┐  │             │
│  │  │ NAT Gateway  │    │          │  │ Bastion Host   │  │             │
│  │  └──────┬───────┘    │          │  │ (SSH from My   │  │             │
│  │         │             │          │  │  IP only)      │  │             │
│  └─────────┼─────────────┘          │  └────────┬───────┘  │             │
│            │                        └───────────┼──────────┘             │
│            │                                    │                        │
│            │    ┌─────────────────────┐          │                        │
│            │    │    Internet         │          │                        │
│            │    │    Gateway          │          │                        │
│            │    └────────┬────────────┘          │                        │
│            │             │                       │                        │
│            │    ┌────────┴────────────┐          │                        │
│            │    │   ALB (internet-    │          │                        │
│            │    │   facing)           │          │                        │
│            │    └────┬───────────┬────┘          │                        │
│            │         │           │               │                        │
│  ┌─────────┼─────────┼───┐  ┌───┼───────────────┼──────────┐            │
│  │ Private: 10.0.16.0/20│  │ Private: 10.0.32.0/20         │            │
│  │         │         │   │  │   │               │           │            │
│  │  ┌──────▼───────┐ │  │  │ ┌─▼───────────────▼─────┐    │            │
│  │  │ EC2 (App)    │ │  │  │ │ EC2 (App)              │    │            │
│  │  │ (Blue/Green) │◄┘  │  │ │ (Blue/Green)           │    │            │
│  │  └──────────────┘    │  │ └────────────────────────┘    │            │
│  └──────────────────────┘  └───────────────────────────────┘            │
│                                                                          │
│  Route Tables:                                                           │
│    Public:  0.0.0.0/0 → Internet Gateway                                │
│    Private: 0.0.0.0/0 → NAT Gateway                                    │
│                                                                          │
│  Security Groups:                                                        │
│    ALB SG:     inbound 80/443 from 0.0.0.0/0                           │
│    EC2 SG:     inbound 8080 from ALB SG only                           │
│    Bastion SG: inbound 22 from deployer's IP only                      │
│    EFS SG:     inbound 2049 from EC2 SG only                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### VPC Design Principles

- **EC2 instances run in private subnets** — no direct internet access, no public IPs
- **ALB sits in public subnets** — the only internet-facing resource for application traffic
- **NAT Gateway in public subnet** — allows private EC2 instances to pull packages, reach AWS APIs
- **Bastion Host in public subnet** — SSH access restricted to the deployer's IP address via security group
- **2 Availability Zones** — ensures high availability for ALB and ASG

### CloudFormation VPC Parameters

| Parameter | Default | Description |
|---|---|---|
| `VpcCidr` | `10.0.0.0/16` | VPC CIDR block |
| `PublicSubnet1Cidr` | `10.0.0.0/20` | Public subnet in AZ-a |
| `PublicSubnet2Cidr` | `10.0.48.0/20` | Public subnet in AZ-b |
| `PrivateSubnet1Cidr` | `10.0.16.0/20` | Private subnet in AZ-a (EC2 instances) |
| `PrivateSubnet2Cidr` | `10.0.32.0/20` | Private subnet in AZ-b (EC2 instances) |
| `BastionAllowedCidr` | *(required)* | Deployer's IP for SSH access (e.g., `203.0.113.42/32`) |

---

## Additional GitHub Actions Secrets for This Deployment Model

Beyond the authentication secrets above, these are specific to the Blue/Green EC2 model:

| Secret Name | Description | Example |
|---|---|---|
| `AWS_S3_ARTIFACT_BUCKET` | S3 bucket for CodeDeploy deployment artifacts | `itpros-wordaday-deploy-artifacts` |
| `AWS_CODEDEPLOY_APP` | CodeDeploy application name | `itpros-wordaday-app` |
| `AWS_CODEDEPLOY_GROUP` | CodeDeploy deployment group name | `itpros-wordaday-bg-group` |
| `AWS_CODEBUILD_PROJECT` | CodeBuild project name | `itpros-wordaday-build` |
| `AWS_ASG_NAME` | Auto Scaling Group name | `itpros-wordaday-asg` |
| `AWS_EFS_FILE_SYSTEM_ID` | EFS file system ID | `fs-0abc1234def56789` |
| `AWS_VPC_ID` | VPC ID | `vpc-0abc1234` |
| `AWS_SUBNET_IDS` | Comma-separated subnet IDs (at least 2 AZs) | `subnet-abc123,subnet-def456` |
| `AWS_KEYPAIR_NAME` | EC2 key pair name for SSH access (optional) | `itpros-wordaday-key` |
| `AWS_BASTION_ALLOWED_CIDR` | Deployer's IP CIDR for Bastion SSH access | `203.0.113.42/32` |

## Environment Variables for AWS Mode

Stored in **SSM Parameter Store** and injected into EC2 instances at boot via user data script:

| SSM Parameter Path | Value | Description |
|---|---|---|
| `/itpros-wordaday/deployment-mode` | `aws` | Tells Go backend to use AWS-native services |
| `/itpros-wordaday/port` | `8080` | Server port |
| `/itpros-wordaday/data-root-path` | `/mnt/efs/data` | Path to word JSON files on EFS mount |
| `/itpros-wordaday/page-size` | `20` | Default pagination size |
| `/itpros-wordaday/enable-redis` | `false` | Set to `true` if ElastiCache is provisioned |
| `/itpros-wordaday/redis-addr` | `` | Redis endpoint (when enabled) |
| `/itpros-wordaday/app-version` | `<git-sha>` | Updated by Lambda hook after each deployment |

## Existing Assets This Model Reuses

- **Dockerfile** at repo root: Used by CodeBuild to build the Go binary (build stage only — the binary is extracted, not the full image)
- **Go backend** (`Services/EnglishWordADayService/`): Compiled to a static binary, deployed directly to EC2
- **Next.js frontend** (`Portals/EnglishWordADayPortal/`): Built as static export (`next export`), served by Go backend from `/app/public/`
- **Word JSON data files**: Copied to Amazon EFS once, shared across all EC2 instances

## GitHub Actions Workflows to Generate

All workflows are manually triggered (`workflow_dispatch`). They use numbers 08-11, continuing after the ECS Fargate model (05-07).

---

### Workflow 08: `08-aws-bg-build.yml` — Build Deployment Artifact

**Name**: `08 - AWS Blue/Green Build Artifact`

**Trigger**: `workflow_dispatch` (manual only)

**Permissions**: `id-token: write`, `contents: read`

**Purpose**: Build the Go binary and Next.js static export, package them with CodeDeploy scripts, and upload the zip artifact to S3.

**Steps**:
1. Checkout the repository
2. Configure AWS credentials using OIDC federation (`aws-actions/configure-aws-credentials@v6`) with `AWS_IAM_ROLE_ARN` and `AWS_REGION` secrets
3. Setup Go 1.21 and Node.js 20
4. Build the Go backend:
   ```
   cd Services/EnglishWordADayService && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server .
   ```
5. Build the Next.js frontend static export:
   ```
   cd Portals/EnglishWordADayPortal && npm ci && npm run build
   ```
6. Assemble the deployment bundle directory structure:
   ```
   deploy-bundle/
   ├── appspec.yml                    # CodeDeploy lifecycle hooks
   ├── scripts/
   │   ├── install_dependencies.sh    # Install runtime dependencies on EC2
   │   ├── start_server.sh            # Start the Go server as a systemd service
   │   ├── stop_server.sh             # Stop the Go server gracefully
   │   └── validate_service.sh        # Health check after deployment
   ├── app/
   │   ├── server                     # Go binary
   │   └── public/                    # Next.js static export output
   └── data/
       └── words/                     # Word JSON files (all genres)
   ```
7. Zip the deployment bundle
8. Upload the zip to S3: `s3://${{ secrets.AWS_S3_ARTIFACT_BUCKET }}/deploys/${{ github.sha }}.zip`
9. Print the S3 URI and artifact size

---

### Workflow 09: `09-aws-bg-deploy.yml` — Trigger Blue/Green Deployment

**Name**: `09 - AWS Blue/Green Deploy`

**Trigger**: `workflow_dispatch` (manual only)

**Permissions**: `id-token: write`, `contents: read`

**Purpose**: Trigger a CodeDeploy Blue/Green deployment using the latest artifact from S3.

**Steps**:
1. Checkout the repository
2. Configure AWS credentials using OIDC federation
3. Create a CodeDeploy deployment:
   ```
   aws deploy create-deployment \
     --application-name ${{ secrets.AWS_CODEDEPLOY_APP }} \
     --deployment-group-name ${{ secrets.AWS_CODEDEPLOY_GROUP }} \
     --s3-location bucket=${{ secrets.AWS_S3_ARTIFACT_BUCKET }},key=deploys/${{ github.sha }}.zip,bundleType=zip \
     --description "Deploy ${{ github.sha }} from GitHub Actions"
   ```
4. Wait for deployment to complete:
   ```
   aws deploy wait deployment-successful --deployment-id <id>
   ```
   Set a timeout of 15 minutes. If it exceeds this, the workflow fails.
5. Print the deployment status, deployment ID, and the ALB DNS name
6. If deployment fails, print the deployment error info:
   ```
   aws deploy get-deployment --deployment-id <id>
   ```

---

### Workflow 10: `10-aws-bg-infrastructure.yml` — Create/Update Infrastructure via CloudFormation

**Name**: `10 - AWS Blue/Green Infrastructure (CloudFormation)`

**Trigger**: `workflow_dispatch` (manual only)

**Permissions**: `id-token: write`, `contents: read`

**Purpose**: Create or update all AWS infrastructure for the Blue/Green deployment model using a CloudFormation stack.

**Steps**:
1. Checkout the repository
2. Configure AWS credentials using OIDC federation
3. Deploy the CloudFormation stack from `aws/blue-green/cloudformation.yml`:
   ```
   aws cloudformation deploy \
     --template-file aws/blue-green/cloudformation.yml \
     --stack-name itpros-wordaday-bg-stack \
     --parameter-overrides \
       BastionAllowedCidr=${{ secrets.AWS_BASTION_ALLOWED_CIDR }} \
       KeyPairName=${{ secrets.AWS_KEYPAIR_NAME }} \
       EfsFileSystemId=${{ secrets.AWS_EFS_FILE_SYSTEM_ID }} \
     --capabilities CAPABILITY_NAMED_IAM \
     --no-fail-on-empty-changeset
   ```
4. Print stack outputs (ALB DNS name, ASG name, CodeDeploy app/group, S3 bucket)

---

### Workflow 11: `11-aws-bg-efs-sync.yml` — Sync Word Data to EFS

**Name**: `11 - AWS Sync Word Data to EFS`

**Trigger**: `workflow_dispatch` (manual only)

**Permissions**: `id-token: write`, `contents: read`

**Purpose**: Upload the latest word JSON files from the repository to the EFS file system via a temporary EC2 instance or AWS DataSync.

**Steps**:
1. Checkout the repository
2. Configure AWS credentials using OIDC federation
3. Upload word data files from `Services/EnglishWordADayService/data/words/` to S3:
   ```
   aws s3 sync Services/EnglishWordADayService/data/words/ \
     s3://${{ secrets.AWS_S3_ARTIFACT_BUCKET }}/efs-data/words/ --delete
   ```
4. Trigger an SSM Run Command on one running EC2 instance in the ASG to sync from S3 to EFS:
   ```
   aws ssm send-command \
     --targets Key=tag:aws:autoscaling:groupName,Values=${{ secrets.AWS_ASG_NAME }} \
     --document-name "AWS-RunShellScript" \
     --parameters 'commands=["aws s3 sync s3://<bucket>/efs-data/words/ /mnt/efs/data/words/ --delete"]' \
     --max-concurrency "1" --max-errors "0"
   ```
5. Wait for the command to complete, then print status

---

## Files to Generate

### 1. `aws/blue-green/appspec.yml`

The CodeDeploy application specification file. Placed at the root of the deployment bundle.

```yaml
version: 0.0
os: linux
files:
  - source: app/server
    destination: /opt/itpros-wordaday/
  - source: app/public
    destination: /opt/itpros-wordaday/public/
  - source: data/words
    destination: /opt/itpros-wordaday/data/words/
permissions:
  - object: /opt/itpros-wordaday/server
    owner: ec2-user
    group: ec2-user
    mode: 755
hooks:
  BeforeInstall:
    - location: scripts/stop_server.sh
      timeout: 60
      runas: root
  AfterInstall:
    - location: scripts/install_dependencies.sh
      timeout: 120
      runas: root
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 60
      runas: root
  ValidateService:
    - location: scripts/validate_service.sh
      timeout: 60
      runas: root
```

### 2. `aws/blue-green/scripts/install_dependencies.sh`

- Install `ca-certificates` if not present
- Mount EFS file system at `/mnt/efs` if not already mounted:
  ```
  mount -t efs <EFS_ID>:/ /mnt/efs
  ```
- Read SSM parameters and write them to `/opt/itpros-wordaday/.env`:
  ```
  aws ssm get-parameters-by-path --path /itpros-wordaday/ --with-decryption
  ```
- Set ownership of `/opt/itpros-wordaday/` to `ec2-user`

### 3. `aws/blue-green/scripts/start_server.sh`

- Create a systemd service file at `/etc/systemd/system/itpros-wordaday.service`:
  ```ini
  [Unit]
  Description=IT Pros WordADay Go Server
  After=network.target

  [Service]
  Type=simple
  User=ec2-user
  WorkingDirectory=/opt/itpros-wordaday
  EnvironmentFile=/opt/itpros-wordaday/.env
  ExecStart=/opt/itpros-wordaday/server
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  ```
- Reload systemd daemon and start the service:
  ```
  systemctl daemon-reload
  systemctl enable itpros-wordaday
  systemctl start itpros-wordaday
  ```

### 4. `aws/blue-green/scripts/stop_server.sh`

- Gracefully stop the Go server:
  ```
  systemctl stop itpros-wordaday || true
  ```
- Remove old application files (but not the EFS mount)

### 5. `aws/blue-green/scripts/validate_service.sh`

- Wait up to 30 seconds for the server to start
- Hit the health endpoint:
  ```
  curl -sf http://localhost:8080/api/health
  ```
- Exit 0 on success, exit 1 on failure (triggers CodeDeploy rollback)

### 6. `aws/blue-green/lambda/deployment_hook.py`

A Python Lambda function for CodeDeploy lifecycle hooks:

- **AfterAllowTraffic hook**: Called by CodeDeploy after traffic shifts to Green
  - Reads the ALB DNS from the CloudFormation stack output
  - Hits `http://<alb-dns>/api/health` and verifies the response
  - Updates SSM Parameter Store `/itpros-wordaday/app-version` with the new deployment's git SHA
  - Updates SSM Parameter Store `/itpros-wordaday/last-deploy-timestamp` with current UTC timestamp
  - Calls `codedeploy.put_lifecycle_event_hook_execution_status` with `Succeeded` or `Failed`

### 7. `aws/blue-green/cloudformation.yml`

A CloudFormation template for the full Blue/Green infrastructure:

**Parameters**:
- `VpcCidr` — VPC CIDR block, default `10.0.0.0/16`
- `PublicSubnet1Cidr` — Public subnet AZ-a, default `10.0.0.0/20`
- `PublicSubnet2Cidr` — Public subnet AZ-b, default `10.0.48.0/20`
- `PrivateSubnet1Cidr` — Private subnet AZ-a, default `10.0.16.0/20`
- `PrivateSubnet2Cidr` — Private subnet AZ-b, default `10.0.32.0/20`
- `BastionAllowedCidr` — Deployer's IP for Bastion SSH access (e.g., `203.0.113.42/32`)
- `KeyPairName` — EC2 key pair name for Bastion/app SSH (optional)
- `InstanceType` — EC2 instance type, default `t3.micro`
- `AmiId` — Amazon Linux 2023 AMI ID, default uses SSM public parameter `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`
- `DesiredCapacity` — ASG desired count, default `1`
- `MinSize` — ASG min, default `1`
- `MaxSize` — ASG max, default `3`
- `EfsFileSystemId` — existing EFS file system ID (if empty, create a new one)
- `ContainerPort` — application port, default `8080`

**Resources**:

**Networking (VPC)**:
1. **VPC**: CIDR `10.0.0.0/16`, enable DNS support and DNS hostnames
2. **Internet Gateway**: attached to the VPC
3. **Public Subnet 1** (AZ-a): `10.0.0.0/20`, map public IP on launch
4. **Public Subnet 2** (AZ-b): `10.0.48.0/20`, map public IP on launch
5. **Private Subnet 1** (AZ-a): `10.0.16.0/20`, no public IP
6. **Private Subnet 2** (AZ-b): `10.0.32.0/20`, no public IP
7. **NAT Gateway**: in Public Subnet 1, with an Elastic IP
8. **Public Route Table**: route `0.0.0.0/0` → Internet Gateway, associated with both public subnets
9. **Private Route Table**: route `0.0.0.0/0` → NAT Gateway, associated with both private subnets

**Bastion Host**:
10. **Bastion Security Group**: allows inbound SSH (22) from `BastionAllowedCidr` only, all outbound
11. **Bastion EC2 Instance**: in Public Subnet 2, key pair from parameter, Amazon Linux 2023, `t3.micro`

**Storage & Logging**:
12. **S3 Bucket**: `itpros-wordaday-deploy-artifacts`, versioning enabled, lifecycle rule to delete objects after 30 days
13. **CloudWatch Log Group**: `/ec2/itpros-wordaday`, retention 30 days
14. **EFS File System** (conditional — only if `EfsFileSystemId` is empty): encrypted, performance mode `generalPurpose`, throughput mode `bursting`
15. **EFS Mount Targets**: one per private subnet, using the EFS security group
16. **EFS Security Group**: allows inbound NFS (2049) from the EC2 security group only

**Load Balancer**:
17. **ALB Security Group**: allows inbound HTTP (80) and HTTPS (443) from `0.0.0.0/0`, all outbound
18. **Application Load Balancer**: internet-facing, in both public subnets, with ALB security group
19. **ALB Target Group (Blue)**: target type `instance`, port 8080, protocol HTTP, health check path `/api/health`, interval 30s, healthy threshold 2, unhealthy threshold 3
20. **ALB Target Group (Green)**: same configuration as Blue target group
21. **ALB Listener**: port 80, default action forward to Blue target group

**Compute**:
22. **EC2 Security Group**: allows inbound 8080 from ALB SG, inbound SSH (22) from Bastion SG, outbound all, outbound NFS (2049) to EFS SG
23. **EC2 Instance Profile + IAM Role**: permissions for S3 read (artifacts), SSM read (parameters), EFS mount, CloudWatch Logs write, CodeDeploy agent
24. **Launch Template**: AMI from parameter, instance type from parameter, instance profile, EC2 security group, user data script that:
    - Installs CodeDeploy agent
    - Installs `amazon-efs-utils`
    - Creates EFS mount point at `/mnt/efs`
    - Mounts the EFS file system
    - Installs CloudWatch agent
    - Starts the CloudWatch agent with log config for `/var/log/itpros-wordaday/*.log`
25. **Auto Scaling Group**: uses the Launch Template, desired/min/max from parameters, both private subnets, Blue target group attachment, tags for CodeDeploy targeting

**CodeDeploy**:
26. **CodeDeploy Application**: `itpros-wordaday-app`, compute platform `Server`
27. **CodeDeploy Deployment Group**: `itpros-wordaday-bg-group`, Blue/Green deployment configuration:
    - `deploymentStyle`: `WITH_TRAFFIC_CONTROL`, `BLUE_GREEN`
    - `blueGreenDeploymentConfiguration`:
      - `terminateBlueInstancesOnDeploymentSuccess`: action `TERMINATE`, wait time 5 minutes
      - `deploymentReadyOption`: action `CONTINUE_DEPLOYMENT` (auto-proceed after health check)
      - `greenFleetProvisioningOption`: action `COPY_AUTO_SCALING_GROUP`
    - `loadBalancerInfo`: target group pair with Blue and Green target groups, production listener ARN
    - `autoScalingGroups`: the ASG name
    - `serviceRoleArn`: CodeDeploy service role
28. **CodeDeploy Service Role**: IAM role with `AWSCodeDeployRole` managed policy

**Lambda & SSM**:
29. **Lambda Execution Role**: IAM role with permissions for CodeDeploy hook callbacks, SSM read/write, CloudFormation describe, CloudWatch Logs
30. **Lambda Function**: `itpros-wordaday-deploy-hook`, Python 3.12 runtime, code from `aws/blue-green/lambda/deployment_hook.py`, environment variables for stack name and SSM parameter path
31. **SSM Parameters**: initial values for `/itpros-wordaday/deployment-mode`, `/itpros-wordaday/port`, `/itpros-wordaday/data-root-path`, `/itpros-wordaday/page-size`, `/itpros-wordaday/app-version`

**Outputs**:
- `VpcId` — the created VPC ID
- `PublicSubnetIds` — comma-separated public subnet IDs
- `PrivateSubnetIds` — comma-separated private subnet IDs
- `BastionPublicIp` — Bastion host public IP for SSH access
- `AlbDnsName` — the ALB DNS name (application URL)
- `AutoScalingGroupName` — ASG name
- `CodeDeployAppName` — CodeDeploy application name
- `CodeDeployGroupName` — CodeDeploy deployment group name
- `S3ArtifactBucket` — S3 bucket for deployment artifacts
- `EfsFileSystemId` — EFS file system ID
- `LogGroupName` — CloudWatch log group name

### 8. GitHub Actions workflow files

As described in the "GitHub Actions Workflows to Generate" section above:
- `.github/workflows/08-aws-bg-build.yml`
- `.github/workflows/09-aws-bg-deploy.yml`
- `.github/workflows/10-aws-bg-infrastructure.yml`
- `.github/workflows/11-aws-bg-efs-sync.yml`

---

## How to Use This Deployment Model

### First-time setup (one time only)

1. **Create the OIDC identity provider and IAM role** in AWS for GitHub Actions (see "GitHub Actions to AWS Authentication" section above)
2. **Add all required secrets** listed in the secrets sections to the GitHub repository Settings > Secrets
3. **Run workflow 10** (`10 - AWS Blue/Green Infrastructure`) to create the CloudFormation stack
4. **Run workflow 11** (`11 - AWS Sync Word Data to EFS`) to upload the initial word data to EFS
5. **Run workflow 08** (`08 - AWS Blue/Green Build Artifact`) to build and upload the first deployment artifact
6. **Run workflow 09** (`09 - AWS Blue/Green Deploy`) to trigger the first CodeDeploy deployment

### Subsequent deployments (after code changes)

1. Push code changes to GitHub
2. Manually run workflow **08** to build a new artifact
3. Manually run workflow **09** to deploy via Blue/Green
4. If word data files changed, also run workflow **11** to sync to EFS
5. CodeDeploy health check on `/api/health` confirms the deployment is healthy

### Rollback

CodeDeploy automatically rolls back if:
- The `ValidateService` script fails (health check on `/api/health`)
- The Lambda `AfterAllowTraffic` hook fails
- The deployment times out

To manually roll back:
```
aws deploy create-deployment \
  --application-name itpros-wordaday-app \
  --deployment-group-name itpros-wordaday-bg-group \
  --revision revisionType=S3,s3Location={bucket=<bucket>,key=deploys/<previous-sha>.zip,bundleType=zip}
```

### Verification

- Access the application via the ALB DNS name from CloudFormation outputs
- Check EC2 instance logs: `aws logs tail /ec2/itpros-wordaday --follow`
- Check deployment status: `aws deploy get-deployment --deployment-id <id>`
- Check EFS data: SSH into an instance and run `ls /mnt/efs/data/words/`
- Check SSM parameters: `aws ssm get-parameters-by-path --path /itpros-wordaday/`

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
| **Workflows** | 03 | 05, 06, 07 | 08, 09, 10, 11 |

## Important Constraints

- All workflows are **manually triggered** — no automatic deployments on push
- The Go backend binary is compiled for **linux/amd64** (`CGO_ENABLED=0 GOOS=linux GOARCH=amd64`)
- Word JSON files live on **EFS**, not inside the deployment bundle, so data updates (workflow 11) are independent of code deployments (workflows 08+09)
- EC2 instances must have the **CodeDeploy agent** installed (handled by the Launch Template user data)
- The ALB health check path is **`/api/health`** — the Go backend must respond 200 on this endpoint
- SSM Parameter Store is the **single source of truth** for runtime configuration — do not hardcode values in deployment scripts
- CloudFormation manages infrastructure as code — never create AWS resources manually outside the stack
- The EFS mount point is always **`/mnt/efs`** and the data root for the Go backend is **`/mnt/efs/data`**

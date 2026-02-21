#!/bin/bash
set -e

REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
EFS_MOUNT="/mnt/efs"
ENV_FILE="/opt/itpros-wordaday/.env"

echo "Installing dependencies..."
yum install -y ca-certificates amazon-efs-utils jq 2>/dev/null || true

if ! mountpoint -q "${EFS_MOUNT}"; then
  echo "Mounting EFS at ${EFS_MOUNT}..."
  mkdir -p "${EFS_MOUNT}"

  EFS_ID=$(aws ssm get-parameter \
    --name "/itpros-wordaday/efs-id" \
    --region "${REGION}" \
    --query 'Parameter.Value' --output text 2>/dev/null || echo "")

  if [ -n "${EFS_ID}" ]; then
    mount -t efs "${EFS_ID}":/ "${EFS_MOUNT}"
    echo "EFS ${EFS_ID} mounted."
  else
    echo "No EFS ID found in SSM, skipping mount."
  fi
fi

echo "Loading configuration from SSM Parameter Store..."
PARAMS=$(aws ssm get-parameters-by-path \
  --path /itpros-wordaday/ \
  --with-decryption \
  --region "${REGION}" \
  --query 'Parameters[*].[Name,Value]' --output text 2>/dev/null || echo "")

> "${ENV_FILE}"
while IFS=$'\t' read -r name value; do
  KEY=$(echo "${name}" | sed 's|.*/||' | tr '[:lower:]-' '[:upper:]_')
  echo "${KEY}=${value}" >> "${ENV_FILE}"
done <<< "${PARAMS}"

if [ ! -s "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" << 'DEFAULTS'
DEPLOYMENT_MODE=aws
PORT=8080
DATA_ROOT_PATH=/mnt/efs/data
PAGE_SIZE=20
DEFAULTS
fi

chown -R ec2-user:ec2-user /opt/itpros-wordaday/
echo "Dependencies installed, config written to ${ENV_FILE}."

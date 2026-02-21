#!/bin/bash
set -e

MAX_RETRIES=10
RETRY_INTERVAL=3
URL="http://localhost:8080/api/health"

echo "Validating service health at ${URL}..."
for i in $(seq 1 ${MAX_RETRIES}); do
  if curl -sf "${URL}" > /dev/null 2>&1; then
    echo "Health check passed on attempt ${i}."
    exit 0
  fi
  echo "Attempt ${i}/${MAX_RETRIES} failed, retrying in ${RETRY_INTERVAL}s..."
  sleep ${RETRY_INTERVAL}
done

echo "Health check failed after ${MAX_RETRIES} attempts."
exit 1

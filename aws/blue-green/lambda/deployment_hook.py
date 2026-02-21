"""
CodeDeploy lifecycle hook — AfterAllowTraffic.

Validates the deployment by hitting the ALB health endpoint,
then updates SSM Parameter Store with deployment metadata.
"""

import json
import os
import urllib.request
from datetime import datetime, timezone

import boto3

codedeploy = boto3.client("codedeploy")
ssm = boto3.client("ssm")
cfn = boto3.client("cloudformation")

STACK_NAME = os.environ.get("STACK_NAME", "itpros-wordaday-bg-stack")
SSM_PREFIX = os.environ.get("SSM_PREFIX", "/itpros-wordaday")


def get_alb_dns():
    resp = cfn.describe_stacks(StackName=STACK_NAME)
    for output in resp["Stacks"][0]["Outputs"]:
        if output["OutputKey"] == "AlbDnsName":
            return output["OutputValue"]
    return None


def health_check(alb_dns):
    url = f"http://{alb_dns}/api/health"
    try:
        req = urllib.request.urlopen(url, timeout=10)
        return req.status == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False


def update_ssm(deployment_id):
    now = datetime.now(timezone.utc).isoformat()
    ssm.put_parameter(
        Name=f"{SSM_PREFIX}/app-version",
        Value=deployment_id,
        Type="String",
        Overwrite=True,
    )
    ssm.put_parameter(
        Name=f"{SSM_PREFIX}/last-deploy-timestamp",
        Value=now,
        Type="String",
        Overwrite=True,
    )
    print(f"SSM updated: version={deployment_id}, timestamp={now}")


def handler(event, context):
    deployment_id = event.get("DeploymentId")
    hook_execution_id = event.get("LifecycleEventHookExecutionId")

    print(f"Hook called: deployment={deployment_id}, hook={hook_execution_id}")
    print(f"Event: {json.dumps(event)}")

    status = "Failed"
    try:
        alb_dns = get_alb_dns()
        if not alb_dns:
            print("Could not resolve ALB DNS from CloudFormation.")
        elif health_check(alb_dns):
            print(f"Health check passed for {alb_dns}")
            update_ssm(deployment_id)
            status = "Succeeded"
        else:
            print(f"Health check failed for {alb_dns}")
    except Exception as e:
        print(f"Error: {e}")

    codedeploy.put_lifecycle_event_hook_execution_status(
        deploymentId=deployment_id,
        lifecycleEventHookExecutionId=hook_execution_id,
        status=status,
    )

    return {"statusCode": 200, "body": status}

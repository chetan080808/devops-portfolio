#!/usr/bin/env bash
# Pipeline deploy: send the SSM deploy document (infra/terraform/main/ssm-deploy.tf) to the k3s
# node with one parameter, the commit SHA, and wait for it. The node checks that the commit is on
# main, takes deploy/k8s/app from that commit and rolls the site to the matching image. The
# GitHub deploy role can send nothing else (no AWS-RunShellScript).
#
#   scripts/deploy-ssm.sh <40-hex commit sha>
#
# Admin-only changes (other manifests, cert-manager, DRY_RUN / DELETE) still use
# scripts/k8s-apply.sh with an admin profile.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: don't rewrite /paths in AWS CLI arguments

sha=${1:?usage: deploy-ssm.sh <40-hex commit sha>}
[[ $sha =~ ^[0-9a-f]{40}$ ]] || { echo "error: '$sha' is not a full lowercase commit SHA" >&2; exit 2; }
region=${AWS_REGION:-ap-south-1}
document=${DEPLOY_DOCUMENT:-devops-portfolio-deploy}

instance=${NODE_INSTANCE_ID:-$(aws ec2 describe-instances --region "$region" \
  --filters Name=tag:Name,Values=devops-portfolio-k3s Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)}
[[ $instance == i-* ]] || { echo "error: k3s node not found (got '$instance')" >&2; exit 1; }

echo "→ $document ImageTag=$sha on $instance"
cmd=$(aws ssm send-command --region "$region" --instance-ids "$instance" \
  --document-name "$document" --parameters "ImageTag=$sha" --comment "deploy ${sha:0:7}" \
  --query Command.CommandId --output text)

# The document allows 540 s; poll for up to 9.5 minutes.
for _ in $(seq 1 114); do
  status=$(aws ssm get-command-invocation --region "$region" --command-id "$cmd" \
    --instance-id "$instance" --query Status --output text 2>/dev/null || echo Pending)
  case $status in Success | Failed | TimedOut | Cancelled) break ;; esac
  sleep 5
done

aws ssm get-command-invocation --region "$region" --command-id "$cmd" --instance-id "$instance" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text
echo "← $status"
[[ $status == Success ]]

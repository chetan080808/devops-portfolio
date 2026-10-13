#!/usr/bin/env bash
# Apply Kubernetes manifests to the k3s node through AWS Systems Manager. The Kubernetes API
# (6443) is never exposed: manifests are rendered here, sent inside an SSM Run Command, and
# applied on the node with k3s' own kubectl.
#
#   scripts/k8s-apply.sh <kustomize-dir | manifest.yaml> [image-tag]
#   scripts/k8s-apply.sh deploy/k8s/app 1cc8189          # site at that commit's image
#   scripts/k8s-apply.sh deploy/k8s/tls/staging/certificate.yaml
#   DELETE=1 scripts/k8s-apply.sh deploy/k8s/tls/staging/certificate.yaml
#   DRY_RUN=1 scripts/k8s-apply.sh deploy/k8s/app abc1234   # server-side validation, no change
#
# Needs: kubectl (only for `kustomize`), aws CLI with SSM rights, python. Region ap-south-1.
# The node is found by its Name tag unless NODE_INSTANCE_ID is set.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: don't rewrite /paths in AWS CLI arguments

target=${1:?usage: k8s-apply.sh <kustomize-dir|file.yaml> [image-tag]}
tag=${2:-}
region=${AWS_REGION:-ap-south-1}
image=ghcr.io/chetan080808/devops-portfolio
# First Python that actually runs (on Windows `python3` can be the Microsoft Store stub).
py=$(for p in python3 python; do "$p" -c '' 2>/dev/null && { echo "$p"; break; }; done)
[[ -n $py ]] || { echo "error: python not found" >&2; exit 1; }

if [[ -d $target ]]; then
  manifests=$(kubectl kustomize "$target")
else
  manifests=$(cat "$target")
fi

if grep -q "$image:unset" <<<"$manifests"; then
  [[ -n $tag ]] || { echo "error: $target needs an image tag (commit SHA)" >&2; exit 2; }
  manifests=${manifests//"$image:unset"/"$image:$tag"}
fi

instance=${NODE_INSTANCE_ID:-$(aws ec2 describe-instances --region "$region" \
  --filters Name=tag:Name,Values=devops-portfolio-k3s Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)}
[[ $instance == i-* ]] || { echo "error: k3s node not found (got '$instance')" >&2; exit 1; }

verb=apply
[[ ${DELETE:-} == 1 ]] && verb="delete --ignore-not-found"
[[ ${DRY_RUN:-} == 1 ]] && verb="$verb --dry-run=server"

# The whole remote script travels base64-encoded: no quoting issues, nothing interpreted on the
# way. It runs as root on the node.
remote=$(cat <<EOF
set -euo pipefail
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
cat > /tmp/manifests.yaml <<'__MANIFESTS__'
$manifests
__MANIFESTS__
k3s kubectl $verb -f /tmp/manifests.yaml
rm -f /tmp/manifests.yaml
if [ "$verb" = "apply" ] && grep -q '^kind: Deployment' <<'__MANIFESTS__'
$manifests
__MANIFESTS__
then
  k3s kubectl -n portfolio rollout status deploy/portfolio --timeout=180s
fi
EOF
)
b64=$(printf '%s' "$remote" | base64 -w0)
(( ${#b64} < 48000 )) || { echo "error: payload ${#b64} B is too large for one SSM command" >&2; exit 1; }

params=$(mktemp --suffix=.json)
trap 'rm -f "$params"' EXIT
# Native path for Python and the AWS CLI (Windows tools can't see Git Bash's /tmp).
params_native=$(command -v cygpath >/dev/null && cygpath -m "$params" || echo "$params")
"$py" -c '
import json, sys
with open(sys.argv[2], "w") as f:
    json.dump({"commands": ["echo %s | base64 -d | bash" % sys.argv[1]], "executionTimeout": ["300"]}, f)
' "$b64" "$params_native"
params_uri="file://$params_native"

echo "→ $verb $target${tag:+ @ $tag} on $instance"
cmd=$(aws ssm send-command --region "$region" --instance-ids "$instance" \
  --document-name AWS-RunShellScript --comment "k8s-apply $(basename "$target")" \
  --parameters "$params_uri" --query Command.CommandId --output text)

# `aws ssm wait command-executed` gives up after 100 s; poll for up to 6 minutes instead.
for _ in $(seq 1 72); do
  status=$(aws ssm get-command-invocation --region "$region" --command-id "$cmd" \
    --instance-id "$instance" --query Status --output text 2>/dev/null || echo Pending)
  case $status in Success | Failed | TimedOut | Cancelled) break ;; esac
  sleep 5
done

aws ssm get-command-invocation --region "$region" --command-id "$cmd" --instance-id "$instance" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text
echo "← $status"
[[ $status == Success ]]

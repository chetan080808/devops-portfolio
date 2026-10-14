# Body of the SSM Command document "<project>-deploy" (ssm-deploy.tf). The ONLY thing the GitHub
# deploy role can run on the node. Its one input, {{ ImageTag }}, is checked by SSM against
# ^[0-9a-f]{40}$ before this script exists on the node, so it is always a full commit SHA and
# cannot carry shell syntax. Runs as root on the k3s node.
#
# 1. The commit must be on main of this repository: GitHub also serves commits pushed to forks
#    through the parent repository's URLs, so "it resolves" is not enough.
# 2. The manifests come from that exact commit (deploy/k8s/app in the public repository), so a
#    deploy is always "the repository at commit X", never manifests chosen by the caller.
# 3. Render with kustomize, pin the image to the commit, stamp the deploy time, apply, and wait
#    for the rollout (a cold image pull took ~3 min 20 s).
set -euo pipefail
tag='{{ ImageTag }}'
repo='__REPO__'
image='__IMAGE__'
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

status=$(curl -fsS --max-time 20 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$repo/compare/$tag...main" |
  python3 -c 'import json, sys; print(json.load(sys.stdin)["status"])')
case $status in
  ahead | identical) echo "commit $tag is on main ($status)" ;;
  *) echo "refusing: commit $tag is not on main (compare status: $status)" >&2; exit 2 ;;
esac

curl -fsSL --max-time 60 -o "$work/src.tar.gz" "https://codeload.github.com/$repo/tar.gz/$tag"
# python3 is always on AL2023 (dnf needs it); only plain files of deploy/k8s/app/ are written.
python3 - "$work" <<'PY'
import os, sys, tarfile
work = sys.argv[1]
out = os.path.join(work, "app")
os.mkdir(out)
with tarfile.open(os.path.join(work, "src.tar.gz")) as t:
    for m in t.getmembers():
        parts = m.name.split("/")
        if m.isfile() and parts[1:4] == ["deploy", "k8s", "app"] and len(parts) == 5 and parts[4] not in ("", ".", ".."):
            with open(os.path.join(out, parts[4]), "wb") as f:
                f.write(t.extractfile(m).read())
PY
k3s kubectl kustomize "$work/app" > "$work/manifests.yaml"
grep -q "$image:unset" "$work/manifests.yaml" || { echo "no $image:unset placeholder in the manifests" >&2; exit 3; }
sed -i -e "s#$image:unset#$image:$tag#g" -e "s#__DEPLOYED_AT__#$(date -u +%Y-%m-%dT%H:%M:%SZ)#g" "$work/manifests.yaml"

k3s kubectl apply -f "$work/manifests.yaml"
k3s kubectl -n portfolio rollout status deploy/portfolio --timeout=420s

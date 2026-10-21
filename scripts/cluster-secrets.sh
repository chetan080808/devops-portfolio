#!/usr/bin/env bash
# Backup / restore of the cluster state that is NOT in git: the TLS certificate secret and the
# Let's Encrypt account keys (restoring them lets a new node reuse the certificate instead of
# requesting a new one). Admin only (SSO profile), through SSM Run Command.
#
#   scripts/cluster-secrets.sh backup  <out-dir>    # writes <out-dir>/cluster-secrets.yaml
#   scripts/cluster-secrets.sh restore <out-dir>    # applies it to the (new) node
#
# SSM keeps every command's parameters and output in its history, so private keys never pass
# through it in plain text:
#   backup:  a one-time RSA key pair is made HERE; the node encrypts the secrets with its public
#            key (random AES-256 key, RSA-OAEP wrapped); only ciphertext comes back.
#   restore: the NODE makes a one-time key pair and returns its public key; the file is encrypted
#            here with it and only ciphertext is sent; the node decrypts, applies, deletes the key.
# Keep <out-dir> outside the repository: it holds private keys.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: don't rewrite /paths in AWS CLI arguments

mode=${1:?usage: cluster-secrets.sh backup|restore <out-dir>}
dir=${2:?usage: cluster-secrets.sh backup|restore <out-dir>}
region=${AWS_REGION:-ap-south-1}
SECRETS="portfolio/chetannamane-com-tls cert-manager/letsencrypt-prod-account cert-manager/letsencrypt-staging-account"
py=$(for p in python3 python; do "$p" -c '' 2>/dev/null && { echo "$p"; break; }; done)
mkdir -p "$dir"
# A directory under the working dir: the Windows AWS CLI can't read Git Bash's /tmp.
work=$(mktemp -d "$dir/.work.XXXXXX")
trap 'rm -rf "$work"' EXIT

instance=${NODE_INSTANCE_ID:-$(aws ec2 describe-instances --region "$region" \
  --filters Name=tag:Name,Values=devops-portfolio-k3s Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)}
[[ $instance == i-* ]] || { echo "error: k3s node not found (got '$instance')" >&2; exit 1; }

# run <script file> → stdout of the script on the node (fails if the command fails)
run() {
  local params
  params=$("$py" -c 'import json,sys; print(json.dumps({"commands": [open(sys.argv[1]).read()]}))' "$1")
  printf '%s' "$params" > "$work/params.json"
  local id status
  id=$(aws ssm send-command --region "$region" --instance-ids "$instance" --document-name AWS-RunShellScript \
    --comment "cluster-secrets $mode" --parameters "file://$(cygpath -m "$work/params.json" 2>/dev/null || echo "$work/params.json")" \
    --query Command.CommandId --output text)
  for _ in $(seq 1 60); do
    status=$(aws ssm get-command-invocation --region "$region" --command-id "$id" --instance-id "$instance" \
      --query Status --output text 2>/dev/null || echo Pending)
    case $status in Success | Failed | TimedOut | Cancelled) break ;; esac
    sleep 3
  done
  aws ssm get-command-invocation --region "$region" --command-id "$id" --instance-id "$instance" \
    --query StandardOutputContent --output text
  [[ $status == Success ]] || { aws ssm get-command-invocation --region "$region" --command-id "$id" \
    --instance-id "$instance" --query StandardErrorContent --output text >&2; return 1; }
}

case $mode in
  backup)
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$work/key.pem" 2>/dev/null
    pub=$(openssl pkey -in "$work/key.pem" -pubout)
    cat > "$work/backup.sh" <<EOF
set -euo pipefail
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
t=\$(mktemp -d); trap 'rm -rf "\$t"' EXIT
cat > "\$t/pub.pem" <<'PUB'
$pub
PUB
for s in $SECRETS; do
  k3s kubectl -n "\${s%%/*}" get secret "\${s#*/}" -o json
done | python3 -c '
import json, sys
dec = json.JSONDecoder(); text = sys.stdin.read(); i = 0; items = []
while i < len(text):
    if text[i].isspace(): i += 1; continue
    o, i = dec.raw_decode(text, i)
    m = o["metadata"]
    for k in ("uid", "resourceVersion", "creationTimestamp", "managedFields", "ownerReferences"): m.pop(k, None)
    items.append(o)
print(json.dumps({"apiVersion": "v1", "kind": "List", "items": items}))' > "\$t/secrets.json"
openssl rand -out "\$t/aes.key" 32
openssl pkeyutl -encrypt -pubin -inkey "\$t/pub.pem" -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in "\$t/aes.key" | base64 -w0; echo
openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:"\$t/aes.key" -in "\$t/secrets.json" | base64 -w0; echo
EOF
    run "$work/backup.sh" > "$work/out.txt"
    sed -n 1p "$work/out.txt" | base64 -d > "$work/aes.enc"
    sed -n 2p "$work/out.txt" | base64 -d > "$work/secrets.enc"
    openssl pkeyutl -decrypt -inkey "$work/key.pem" -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 \
      -in "$work/aes.enc" -out "$work/aes.key"
    openssl enc -d -aes-256-cbc -pbkdf2 -pass file:"$work/aes.key" -in "$work/secrets.enc" -out "$dir/cluster-secrets.json"
    "$py" - "$dir/cluster-secrets.json" <<'PY'
import base64, json, sys
d = json.load(open(sys.argv[1]))
for s in d["items"]:
    m = s["metadata"]; data = s.get("data", {})
    line = f'{m["namespace"]}/{m["name"]}: {s.get("type")}, keys {sorted(data)}'
    if "tls.crt" in data:
        import subprocess
        crt = base64.b64decode(data["tls.crt"])
        out = subprocess.run(["openssl", "x509", "-noout", "-subject", "-enddate"], input=crt, capture_output=True).stdout.decode().split("\n")
        line += " | " + " ".join(x for x in out if x)
    print(line)
PY
    echo "saved $dir/cluster-secrets.json"
    ;;
  restore)
    [[ -f $dir/cluster-secrets.json ]] || { echo "error: no $dir/cluster-secrets.json" >&2; exit 2; }
    cat > "$work/keygen.sh" <<'EOF'
set -euo pipefail
umask 077
mkdir -p /root/.restore
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /root/.restore/key.pem 2>/dev/null
openssl pkey -in /root/.restore/key.pem -pubout
EOF
    run "$work/keygen.sh" > "$work/node-pub.pem"
    openssl rand -out "$work/aes.key" 32
    aes=$(openssl pkeyutl -encrypt -pubin -inkey "$work/node-pub.pem" -pkeyopt rsa_padding_mode:oaep \
      -pkeyopt rsa_oaep_md:sha256 -in "$work/aes.key" | base64 -w0)
    body=$(openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:"$work/aes.key" -in "$dir/cluster-secrets.json" | base64 -w0)
    cat > "$work/restore.sh" <<EOF
set -euo pipefail
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
t=\$(mktemp -d); trap 'rm -rf "\$t" /root/.restore' EXIT
echo '$aes' | base64 -d > "\$t/aes.enc"
echo '$body' | base64 -d > "\$t/secrets.enc"
openssl pkeyutl -decrypt -inkey /root/.restore/key.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in "\$t/aes.enc" -out "\$t/aes.key"
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:"\$t/aes.key" -in "\$t/secrets.enc" -out "\$t/secrets.json"
for ns in portfolio cert-manager; do k3s kubectl create namespace "\$ns" --dry-run=client -o yaml | k3s kubectl apply -f - >/dev/null; done
k3s kubectl apply -f "\$t/secrets.json"
EOF
    run "$work/restore.sh"
    ;;
  *) echo "usage: cluster-secrets.sh backup|restore <out-dir>" >&2; exit 2 ;;
esac

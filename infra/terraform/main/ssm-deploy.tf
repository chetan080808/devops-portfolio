# The deploy as an SSM Command document: a fixed script (deploy-document.sh) with ONE parameter,
# the commit SHA. The GitHub deploy role may send only this document, only to the node
# (github-oidc.tf), so a stolen workflow token can roll the site to another commit of main and
# nothing else; it can no longer run arbitrary shell commands as root (AWS-RunShellScript).

resource "aws_ssm_document" "deploy" {
  name            = "${var.project}-deploy"
  document_type   = "Command"
  document_format = "JSON"
  target_type     = "/AWS::EC2::Instance"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy ${var.github_owner}/${var.github_repo} at a commit of main to the k3s node"
    parameters = {
      ImageTag = {
        type           = "String"
        description    = "Full commit SHA (40 lowercase hex): image tag and manifests version"
        allowedPattern = "^[0-9a-f]{40}$"
      }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        timeoutSeconds = "540"
        runCommand = split("\n", replace(replace(
          file("${path.module}/deploy-document.sh"),
          "__REPO__", "${var.github_owner}/${var.github_repo}"),
          "__IMAGE__", "ghcr.io/${var.github_owner}/${var.github_repo}"
        ))
      }
    }]
  })
}

output "deploy_document" {
  description = "SSM document the pipeline sends (scripts/deploy-ssm.sh)."
  value       = aws_ssm_document.deploy.name
}

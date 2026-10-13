# GitHub Actions → AWS without stored keys. A workflow run asks GitHub for a short-lived OIDC
# token; AWS STS checks it against this provider and, if the claims match the trust policy,
# returns 1-hour credentials for the deploy role. Nothing long-lived is kept in GitHub.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # No thumbprint: AWS validates GitHub's OIDC endpoint against its own trusted CA store.
}

data "aws_iam_policy_document" "github_deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only jobs that run in this repository's GitHub environment (`environment: production` in
    # the workflow). The environment's deployment-branch rule allows main only, so the branch is
    # enforced by GitHub before a token is even issued.
    # GitHub issues this repository's `sub` with the immutable account and repository IDs
    # (owner@id/repo@id), seen in CloudTrail on 2026-10-13. Matching the IDs means a deleted and
    # re-created account or repository with the same name could never assume this role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}:environment:${var.github_environment}",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "${var.project}-github-deploy"
  description          = "GitHub Actions (environment: production) deploys the site to the k3s node via SSM"
  assume_role_policy   = data.aws_iam_policy_document.github_deploy_trust.json
  max_session_duration = 3600
}

# Exactly what scripts/k8s-apply.sh calls, nothing else: find the node, run one command on it
# with the AWS-RunShellScript document, read the result. No SSM sessions, no Terraform state,
# no IAM, no other instance.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid     = "RunDeployCommandOnTheNode"
    actions = ["ssm:SendCommand"]
    resources = [
      aws_instance.node.arn,
      "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
    ]
  }

  statement {
    sid       = "ReadCommandResults"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"] # these actions don't support resource-level permissions
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }

  statement {
    sid       = "FindTheNodeByTag"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"] # Describe* doesn't support resource-level permissions
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy-via-ssm"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Bucket comes from the bootstrap stack; its name is in backend.hcl (gitignored):
  #   terraform init -backend-config=backend.hcl
  backend "s3" {
    key          = "main/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true # S3-native lock file, no DynamoDB table
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Stack     = "main"
    }
  }
}

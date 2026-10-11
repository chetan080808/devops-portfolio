# Added after the first apply (the bucket has to exist before it can hold state):
#   terraform init -migrate-state -backend-config=../main/backend.hcl
# A fresh clone needs the same -backend-config to init this stack.
terraform {
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

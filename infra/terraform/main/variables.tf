variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project" {
  description = "Name prefix and Project tag."
  type        = string
  default     = "devops-portfolio"
}

variable "availability_zone" {
  type    = string
  default = "ap-south-1a"
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.42.1.0/24"
}

variable "instance_type" {
  description = "Graviton (arm64), 2 vCPU / 2 GiB, same size as the t3.small it replaces (Phase 9 runs on demand only). Rollback: t3.small."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_gb" {
  type    = number
  default = 20
}

variable "pod_cidr" {
  description = "k3s pod network. Must not overlap the VPC: k3s defaults to 10.42.0.0/16."
  type        = string
  default     = "10.52.0.0/16"
}

variable "k3s_version" {
  description = "Pinned k3s release (stable channel on 2026-10-12)."
  type        = string
  default     = "v1.36.5+k3s1"
}

variable "github_owner" {
  description = "GitHub account that owns the repository (lowercase)."
  type        = string
  default     = "chetan080808"
}

variable "github_owner_id" {
  description = "Immutable numeric ID of the GitHub account (api.github.com/users/<owner>)."
  type        = number
  default     = 203205241
}

variable "github_repo" {
  type    = string
  default = "devops-portfolio"
}

variable "github_repo_id" {
  description = "Immutable numeric ID of the repository (api.github.com/repos/<owner>/<repo>)."
  type        = number
  default     = 1408806533
}

variable "github_environment" {
  description = "GitHub environment whose jobs may assume the deploy role (its branch rule: main only)."
  type        = string
  default     = "production"
}

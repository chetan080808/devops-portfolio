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
  description = "2 vCPU / 2 GiB: enough for k3s + Traefik + two Next.js pods."
  type        = string
  default     = "t3.small"
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

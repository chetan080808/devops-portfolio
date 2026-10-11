variable "aws_region" {
  description = "Region for the state bucket (same as the workload)."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Name prefix and Project tag."
  type        = string
  default     = "devops-portfolio"
}

variable "budget_limit_usd" {
  description = "Monthly cost budget for the whole account, in USD."
  type        = number
  default     = 28
}

variable "budget_email" {
  description = "Address that receives budget alerts (set in terraform.tfvars, not committed)."
  type        = string
}

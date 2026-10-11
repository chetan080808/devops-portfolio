output "state_bucket" {
  description = "Put this in infra/terraform/main/backend.hcl."
  value       = aws_s3_bucket.state.id
}

output "budget_name" {
  value = aws_budgets_budget.monthly.name
}

output "instance_id" {
  value = aws_instance.node.id
}

output "public_ip" {
  description = "Point the domain's A record here (7c)."
  value       = aws_eip.node.public_ip
}

output "ssm_shell" {
  description = "Open a shell on the node (no SSH)."
  value       = "aws ssm start-session --target ${aws_instance.node.id} --region ${var.aws_region}"
}

# Latest Amazon Linux 2023 at first apply. ignore_changes keeps a new AMI release from replacing
# the running server; move to a newer AMI deliberately (terraform apply -replace).
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_instance" "node" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.node.name
  monitoring             = false # basic 5-minute metrics are free

  # Burstable CPU stays within the instance price: "unlimited" (the t3 default) bills extra
  # credits when the CPU runs hot for long.
  credit_specification {
    cpu_credits = "standard"
  }

  # IMDSv2 only; hop limit 1 so pods (one network hop further) can't read the instance's role
  # credentials.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_gb
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    k3s_version = var.k3s_version
    pod_cidr    = var.pod_cidr
  })
  # user data only runs on first boot: any change to it must rebuild the node, not just
  # stop/start it with the new script unused.
  user_data_replace_on_change = true

  tags = { Name = "${var.project}-k3s" }

  lifecycle {
    ignore_changes = [ami]
  }
}

# Stable public address for DNS; survives stop/start.
resource "aws_eip" "node" {
  domain   = "vpc"
  instance = aws_instance.node.id

  tags = { Name = var.project }

  depends_on = [aws_internet_gateway.main]
}

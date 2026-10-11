# Only the website is reachable from the internet. No SSH (admin goes through SSM Session
# Manager) and no Kubernetes API (6443 stays on the box; kubectl runs over SSM).

resource "aws_security_group" "web" {
  name        = "${var.project}-web"
  description = "HTTP/HTTPS in; HTTP/HTTPS out"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project}-web" }
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.web.id
  description       = "HTTP (redirect to HTTPS, ACME challenges)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

# Outbound is limited to web ports: SSM, image registries, package repos and the k3s installer
# are all HTTP(S). DNS (VPC resolver) and time sync (169.254.169.123) are not filtered by
# security groups.
resource "aws_vpc_security_group_egress_rule" "https_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS out"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "http_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTP out (package mirrors)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

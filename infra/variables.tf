variable "ssh_public_key" {
  description = "EC2에 등록할 SSH 공개키 (cat ~/.ssh/smoodee.pub)"
  type        = string
}

variable "my_ip" {
  description = "SSH 접근 허용할 본인 IP (예: 1.2.3.4/32)"
  type        = string
}

variable "app_name" {
  description = "애플리케이션 이름"
  type        = string
  default     = "smoodee"
}

variable "region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

output "ec2_public_ip" {
  description = "EC2 Elastic IP"
  value       = aws_eip.main.public_ip
}

output "s3_bucket_name" {
  description = "S3 버킷 이름"
  value       = aws_s3_bucket.main.id
}

output "ecr_backend_url" {
  description = "백엔드 ECR 리포지토리 URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "프론트엔드 ECR 리포지토리 URL"
  value       = aws_ecr_repository.frontend.repository_url
}

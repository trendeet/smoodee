# Smoodee 인프라 가이드

## 아키텍처 개요

```
[개발자 노트북 (Windows / Mac)]
  1. docker build --platform linux/arm64  ← ARM 이미지 빌드
  2. docker push → ECR                    ← 이미지 업로드
  3. ssh → EC2 (설정 파일 전달 + 배포 명령)

        ┌─────────────────────────────────┐
        │  EC2 t4g.medium (ARM, Seoul)    │
        │  Amazon Linux 2023              │
        │                                 │
        │  ┌──────────┐  ┌─────────────┐ │
        │  │ frontend │  │   backend   │ │
        │  │  :3000   │  │    :8080    │ │
        │  │ Next.js  │  │ Spring Boot │ │
        │  └──────────┘  └──────┬──────┘ │
        │                       │        │
        │               ┌───────┴──────┐ │
        │               │   MySQL 8.0  │ │
        │               │    :3306     │ │
        │               └──────────────┘ │
        └─────────────────────────────────┘
              ↕ EIP (고정 IP)

[AWS 관리형 서비스]
  ECR  — Docker 이미지 저장소
  S3   — 파일 업로드 / 렌더 결과물
  SSM  — 시크릿 파라미터 저장소
```

---

## AWS 리소스 목록

| 리소스 | 이름 | 사양 | 월 비용 |
|--------|------|------|---------|
| EC2 | smoodee-server | t4g.medium (2 vCPU / 4GB RAM) | ~$26 |
| EIP | smoodee-eip | 인스턴스에 연결 시 무료 | $0 |
| ECR | smoodee-backend / smoodee-frontend | 500MB/월 무료 | ~$0 |
| S3 | smoodee-prod-{account_id} | 사용량 기준 | ~$1 |
| VPC / 서브넷 / IGW | smoodee-vpc | — | $0 |
| **합계** | | | **~$27/월** |

> $200 크레딧 기준 약 7개월 운영 가능

---

## 사전 준비

### 1. SSH 키 생성
```bash
ssh-keygen -t ed25519 -f ~/.ssh/smoodee -C "smoodee-ec2" -N ""
cat ~/.ssh/smoodee.pub  # terraform apply 시 입력값으로 사용
```

### 2. AWS CLI 프로파일 설정
```bash
aws configure --profile smoodee
# AWS Access Key ID, Secret Access Key, Region(ap-northeast-2) 입력
```

### 3. deploy/.env.deploy 파일 준비
```bash
cp deploy/.env.deploy.example deploy/.env.deploy
# 아래 값들을 채워넣기
```

| 변수 | 설명 |
|------|------|
| `DB_PASSWORD` | MySQL 앱 계정 비밀번호 |
| `DB_ROOT_PASSWORD` | MySQL root 비밀번호 |
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) |
| `APP_DOMAIN` | 서비스 도메인 또는 EC2 IP (예: http://1.2.3.4) |
| `GEMINI_API_KEY` | Gemini API 키 |

---

## 인프라 생성 (terraform apply)

```bash
cd infra

# 초기화 (처음 한 번만)
terraform init

# 적용
terraform apply \
  -var="ssh_public_key=$(cat ~/.ssh/smoodee.pub)" \
  -var="my_ip=$(curl -s ifconfig.me)/32"
```

완료 후 출력값:
```
ec2_public_ip    = "x.x.x.x"
s3_bucket_name   = "smoodee-prod-xxxxxxxxxxxx"
ecr_backend_url  = "xxxx.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-backend"
ecr_frontend_url = "xxxx.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-frontend"
```

---

## 배포 (deploy.sh)

```bash
# 프로젝트 루트에서 실행
bash deploy/deploy.sh
```

### 내부 동작 순서

1. `terraform output`으로 ECR URL, EC2 IP 읽기
2. `docker build --platform linux/arm64` 로 ARM 이미지 빌드
   - 백엔드: Spring Boot JAR 컴파일 + FFmpeg/Python 설치 (5~15분)
   - 프론트엔드: Next.js 빌드 (2~5분)
   - Mac M 시리즈는 네이티브 빌드라 빠름 / Windows·Intel Mac은 QEMU 에뮬레이션으로 느림
3. ECR에 이미지 push
4. EC2에 SSH 접속 → `docker-compose.yml`, `.env` 파일 전달
5. EC2에서 ECR 이미지 pull 후 `docker compose up -d`

---

## 인프라 삭제 (terraform destroy)

```bash
cd infra
terraform destroy \
  -var="ssh_public_key=$(cat ~/.ssh/smoodee.pub)" \
  -var="my_ip=$(curl -s ifconfig.me)/32"
```

> S3(`force_destroy = true`)와 ECR(`force_delete = true`) 설정 덕분에
> 파일/이미지가 남아있어도 한 번에 삭제됩니다.

---

## SSM 파라미터 (선택)

시크릿을 `.env` 파일 대신 SSM Parameter Store로 관리하려면:

```bash
aws ssm put-parameter \
  --name "/smoodee/prod/DB_PASSWORD" \
  --value "your-password" \
  --type SecureString \
  --profile smoodee \
  --region ap-northeast-2
```

EC2 IAM Role에 `ssm:GetParameter` 권한이 부여되어 있습니다.

---

## 트러블슈팅

### terraform destroy 가 멈추는 경우 (Security Group / Subnet)
Terraform 외부에서 생성된 VPC 엔드포인트가 남아있으면 삭제가 블로킹됩니다.

```bash
# 남은 VPC 엔드포인트 확인
aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query "VpcEndpoints[?State!='deleted'].VpcEndpointId" \
  --profile smoodee --region ap-northeast-2

# 수동 삭제
aws ec2 delete-vpc-endpoints \
  --vpc-endpoint-ids vpce-xxxxxxxxx \
  --profile smoodee --region ap-northeast-2
```

### EC2 컨테이너가 뜨지 않는 경우
```bash
ssh -i ~/.ssh/smoodee ec2-user@<EC2_IP>

# 컨테이너 로그 확인
docker compose --env-file ~/.env logs backend
docker compose --env-file ~/.env logs frontend

# 컨테이너 상태 확인
docker compose --env-file ~/.env ps
```

### 이미지 아키텍처 불일치 오류
`exec format error` 메시지가 뜨면 x86_64 이미지를 ARM EC2에 올린 것입니다.
`deploy.sh`에 `--platform linux/arm64` 플래그가 있는지 확인하세요.

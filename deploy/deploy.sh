#!/bin/bash
# Smoodee 배포 스크립트
# 실행 전: terraform apply 완료, .env.deploy 파일 준비 필요
# 사용법: bash deploy/deploy.sh

set -e

REGION="ap-northeast-2"
AWS_PROFILE="${AWS_PROFILE:-smoodee}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/smoodee}"

# ── Terraform output에서 값 읽기 ─────────────────────────
echo "📋 Terraform output 읽는 중..."
ECR_BACKEND=$(terraform -chdir=infra output -raw ecr_backend_url)
ECR_FRONTEND=$(terraform -chdir=infra output -raw ecr_frontend_url)
EC2_IP=$(terraform -chdir=infra output -raw ec2_public_ip)
S3_BUCKET=$(terraform -chdir=infra output -raw s3_bucket_name)

echo "  ECR Backend:  $ECR_BACKEND"
echo "  ECR Frontend: $ECR_FRONTEND"
echo "  EC2 IP:       $EC2_IP"
echo "  S3 Bucket:    $S3_BUCKET"

# ── .env.deploy 파일 존재 확인 ───────────────────────────
if [ ! -f deploy/.env.deploy ]; then
  echo "❌ deploy/.env.deploy 파일이 없습니다."
  echo "   deploy/.env.deploy.example 을 복사해서 값을 채워주세요."
  exit 1
fi

source deploy/.env.deploy

# ── ECR 로그인 ────────────────────────────────────────────
echo "🔐 ECR 로그인 중..."
aws ecr get-login-password --region $REGION --profile $AWS_PROFILE | \
  docker login --username AWS --password-stdin $ECR_BACKEND

# ── 백엔드 이미지 빌드 & 푸시 ────────────────────────────
echo "🏗️  백엔드 빌드 중... (첫 빌드는 5~10분 소요)"
docker build -t "$ECR_BACKEND:latest" ./backend
docker push "$ECR_BACKEND:latest"

# ── 프론트엔드 이미지 빌드 & 푸시 ────────────────────────
echo "🏗️  프론트엔드 빌드 중..."
docker build \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=${APP_DOMAIN}" \
  --build-arg "NEXT_PUBLIC_GEMINI_API_KEY=" \
  -t "$ECR_FRONTEND:latest" \
  ./frontend
docker push "$ECR_FRONTEND:latest"

# ── docker-compose.yml + .env 파일 EC2로 전송 ────────────
echo "📤 설정 파일 EC2로 전송 중..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker/docker-compose.yml "ec2-user@$EC2_IP:~/docker-compose.yml"

# EC2용 .env 파일 생성 (시크릿 포함)
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_IP" bash << REMOTE
cat > ~/.env << 'ENVEOF'
ECR_BACKEND_URL=$ECR_BACKEND
ECR_FRONTEND_URL=$ECR_FRONTEND
S3_BUCKET=$S3_BUCKET
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
JWT_SECRET=$JWT_SECRET
APP_DOMAIN=$APP_DOMAIN
GEMINI_API_KEY=$GEMINI_API_KEY
ENVEOF
chmod 600 ~/.env
REMOTE

# ── EC2에서 컨테이너 실행 ─────────────────────────────────
echo "🚀 EC2에 배포 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_IP" bash << 'REMOTE'
  set -e

  # ECR 로그인 (EC2 instance role 사용)
  ECR_URL=$(grep ECR_BACKEND_URL ~/.env | cut -d= -f2)
  ACCOUNT_ID=$(echo $ECR_URL | cut -d. -f1)
  aws ecr get-login-password --region ap-northeast-2 | \
    docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com"

  # 최신 이미지 pull & 재시작
  cd ~
  docker compose --env-file ~/.env pull
  docker compose --env-file ~/.env up -d

  echo "✅ 배포 완료"
  docker compose --env-file ~/.env ps
REMOTE

echo ""
echo "✅ 배포 완료!"
echo "   서버 IP: http://$EC2_IP"

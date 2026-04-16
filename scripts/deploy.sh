#!/bin/bash
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_ACCOUNT=${AWS_ACCOUNT:-}
AWS_REGION=${AWS_REGION:-us-east-1}
IMAGE_TAG=${2:-latest}

# Validate inputs
if [[ -z "$AWS_ACCOUNT" ]]; then
  echo -e "${RED}Error: AWS_ACCOUNT not set${NC}"
  echo "Usage: AWS_ACCOUNT=123456789012 ./scripts/deploy.sh [dev|prod] [image-tag]"
  exit 1
fi

ECR_REGISTRY="$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com"
BACKEND_IMAGE="$ECR_REGISTRY/vector-dashboard-backend:$IMAGE_TAG"
FRONTEND_IMAGE="$ECR_REGISTRY/vector-dashboard-frontend:$IMAGE_TAG"

echo -e "${YELLOW}Deploying Vector Dashboard ($ENVIRONMENT)${NC}"
echo "Backend image: $BACKEND_IMAGE"
echo "Frontend image: $FRONTEND_IMAGE"
echo ""

# Step 1: Login to ECR
echo -e "${YELLOW}[1/5] Logging in to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Step 2: Build backend
echo -e "${YELLOW}[2/5] Building backend image...${NC}"
docker build -f Dockerfile.backend -t vector-dashboard-backend:$IMAGE_TAG .
docker tag vector-dashboard-backend:$IMAGE_TAG "$BACKEND_IMAGE"

# Step 3: Build frontend
echo -e "${YELLOW}[3/5] Building frontend image...${NC}"
docker build -f Dockerfile.frontend -t vector-dashboard-frontend:$IMAGE_TAG .
docker tag vector-dashboard-frontend:$IMAGE_TAG "$FRONTEND_IMAGE"

# Step 4: Push images
echo -e "${YELLOW}[4/5] Pushing images to ECR...${NC}"
docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"

# Step 5: Update task definition and service
echo -e "${YELLOW}[5/5] Updating ECS task definition and service...${NC}"

# Update image URIs in task definition
sed "s|YOUR_AWS_ACCOUNT|$AWS_ACCOUNT|g; s|us-east-1|$AWS_REGION|g" ecs/task-definition.json > /tmp/task-def.json

# Register task definition
TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def.json \
  --region "$AWS_REGION" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Registered task definition: $TASK_DEF"

# Update service
CLUSTER="vector-dashboard-$ENVIRONMENT"
SERVICE="vector-dashboard"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$TASK_DEF" \
  --force-new-deployment \
  --region "$AWS_REGION" > /dev/null

echo -e "${GREEN}✓ Deployment initiated${NC}"
echo "Monitor progress with:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $AWS_REGION"
echo "  aws logs tail /ecs/vector-dashboard --follow --region $AWS_REGION"

# Cleanup
rm /tmp/task-def.json

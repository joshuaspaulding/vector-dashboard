# Vector Dashboard ECS Deployment Guide

This guide covers deploying the Vector Dashboard as a sidecar container in AWS ECS.

## Architecture

The dashboard runs as three containers in a single ECS task:
- **Vector**: Aggregator instance (port 8686)
- **Dashboard Backend**: Node/Bun server (port 3001)
- **Dashboard Frontend**: React + nginx (port 3000)

All containers share task networking, so the backend accesses Vector via `localhost:8686`.

## Local Development & Testing

### Prerequisites
- Docker and Docker Compose installed
- Vector binary (optional, Docker image handles this)
- Bun (for backend development)
- Node.js (for frontend development)

### Quick Start

1. **Start all services locally:**
   ```bash
   docker-compose up
   ```

2. **Access dashboard:**
   Open http://localhost:3000 in your browser

3. **Verify connectivity:**
   ```bash
   # Vector API
   curl http://localhost:8686/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ health }"}'
   
   # Backend health
   curl http://localhost:3001/health
   
   # Frontend
   curl http://localhost:3000
   ```

### Iterating During Development

**Backend changes:**
```bash
# Edit backend/src/index.ts or other files
docker-compose restart dashboard-backend
# Or rebuild: docker-compose build dashboard-backend
```

**Frontend changes:**
```bash
# Edit frontend/src files
docker-compose build dashboard-frontend
docker-compose restart dashboard-frontend
```

**Restart everything:**
```bash
docker-compose down
docker-compose up
```

### Troubleshooting Local Setup

| Issue | Fix |
|-------|-----|
| "Cannot reach Vector API" | Check Vector is running: `curl http://localhost:8686/graphql` |
| Dashboard blank page | Check backend logs: `docker-compose logs dashboard-backend` |
| WebSocket not connecting | Verify `ws://localhost:3001/ws` in DevTools Network tab |
| Port already in use | Kill process: `lsof -i :3000` or `lsof -i :3001` |
| Docker build fails | Remove cache: `docker-compose build --no-cache` |

## AWS ECS Deployment

### Prerequisites

- AWS CLI v2 installed and configured
- ECR repository created for backend and frontend images
- ECS cluster created
- ALB (Application Load Balancer) configured
- IAM task role and execution role created

### Step 1: Build and Push Docker Images to ECR

Set environment variables:
```bash
export AWS_ACCOUNT=123456789012  # Your AWS account ID
export AWS_REGION=us-east-1
export ECR_REGISTRY=$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
```

Log in to ECR:
```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

Build and push backend:
```bash
docker build -f Dockerfile.backend -t vector-dashboard-backend:latest .
docker tag vector-dashboard-backend:latest $ECR_REGISTRY/vector-dashboard-backend:latest
docker push $ECR_REGISTRY/vector-dashboard-backend:latest
```

Build and push frontend:
```bash
docker build -f Dockerfile.frontend -t vector-dashboard-frontend:latest .
docker tag vector-dashboard-frontend:latest $ECR_REGISTRY/vector-dashboard-frontend:latest
docker push $ECR_REGISTRY/vector-dashboard-frontend:latest
```

### Step 2: Update Task Definition

Update `ecs/task-definition.json`:
- Replace `YOUR_AWS_ACCOUNT` with your AWS account ID
- Replace `us-east-1` with your region
- Replace image URIs with your ECR paths
- Update `CORS_ORIGIN` to your ALB domain

Register the task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs/task-definition.json \
  --region $AWS_REGION
```

### Step 3: Create or Update ECS Service

Create a new service:
```bash
aws ecs create-service \
  --cluster your-cluster-name \
  --service-name vector-dashboard \
  --task-definition vector-with-dashboard:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:$AWS_REGION:$AWS_ACCOUNT:targetgroup/vector-dashboard/xxx,containerName=dashboard-frontend,containerPort=3000" \
  --region $AWS_REGION
```

Or update an existing service:
```bash
aws ecs update-service \
  --cluster your-cluster-name \
  --service vector-dashboard \
  --task-definition vector-with-dashboard:1 \
  --force-new-deployment \
  --region $AWS_REGION
```

### Step 4: Monitor Deployment

Check service status:
```bash
aws ecs describe-services \
  --cluster your-cluster-name \
  --services vector-dashboard \
  --region $AWS_REGION
```

Watch task startup:
```bash
aws ecs list-tasks \
  --cluster your-cluster-name \
  --service-name vector-dashboard \
  --region $AWS_REGION
```

View logs:
```bash
aws logs tail /ecs/vector-dashboard --follow --region $AWS_REGION
```

## Environment Variables

Configure these in the task definition under `containerDefinitions`:

### Backend Container
- `VECTOR_API`: Vector GraphQL endpoint (default: `http://localhost:8686`)
- `PORT`: Backend port (default: `3001`)
- `CORS_ORIGIN`: CORS allowed origin (set to ALB domain, e.g., `https://yourdomain.com`)

### Frontend Container
- No environment variables needed (uses default values)

## ALB Configuration

The ALB should route traffic to the dashboard frontend (port 3000):

1. **Target Group:**
   - Protocol: HTTP
   - Port: 3000
   - Health check path: `/health`
   - Health check interval: 30s
   - Unhealthy threshold: 2

2. **Listener Rule:**
   - Host: `yourdomain.com` (or use path-based routing)
   - Forward to target group

## Scaling

The service automatically scales with your Vector instances:
- Each ECS task replica contains one Vector + one Dashboard
- Scale to N replicas: `aws ecs update-service --desired-count N`
- ALB distributes traffic across all dashboard instances

## Rollback

If a deployment fails, roll back to previous task definition:
```bash
aws ecs update-service \
  --cluster your-cluster-name \
  --service vector-dashboard \
  --task-definition vector-with-dashboard:1 \
  --force-new-deployment \
  --region $AWS_REGION
```

## Verification Checklist

- [ ] Docker images build locally without errors
- [ ] `docker-compose up` starts all three containers
- [ ] Dashboard accessible at http://localhost:3000
- [ ] Vector API reachable via backend at http://localhost:8686
- [ ] WebSocket connection works (DevTools Network → WS)
- [ ] Images pushed to ECR successfully
- [ ] Task definition registered in ECS
- [ ] Service created/updated in ECS
- [ ] ALB target group health checks pass
- [ ] Dashboard accessible via ALB domain
- [ ] CloudWatch logs show no errors

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Vector API Reference](https://vector.dev/docs/reference/api)
- [Bun Documentation](https://bun.sh/docs)
- [Vite Documentation](https://vitejs.dev/)

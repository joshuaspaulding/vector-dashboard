# Vector Dashboard ECS Sidecar Deployment - Implementation Summary

## Overview
The Vector Dashboard has been containerized as a sidecar deployment pattern, with the dashboard running in the same ECS task as Vector. This implementation includes local Docker Compose setup for testing and AWS ECS task definition for production deployment.

## Files Created

### Backend Containerization
1. **`backend/src/config.ts`** - Configuration module that reads environment variables
   - `VECTOR_API`: Vector API endpoint (default: `http://localhost:8686`)
   - `PORT`: Backend port (default: `3001`)
   - `CORS_ORIGIN`: CORS allowed origin (default: `http://localhost:5173`)

2. **`Dockerfile.backend`** - Bun-based backend container
   - Base image: `oven/bun:latest`
   - Installs dependencies and runs backend server
   - Includes health check using `curl` to `/health` endpoint
   - Exposes port 3001

### Frontend Containerization
3. **`Dockerfile.frontend`** - Two-stage React/nginx build
   - Build stage: Node 20 Alpine with npm build
   - Runtime stage: Nginx Alpine serving built assets
   - SPA routing configured (try_files with index.html fallback)
   - Health check endpoint at `/health`
   - Exposes port 3000

### Local Development
4. **`docker-compose.yml`** - Multi-container local setup
   - `vector` service: Official Vector image with `vector.toml` config
   - `dashboard-backend` service: Builds from Dockerfile.backend
   - `dashboard-frontend` service: Builds from Dockerfile.frontend
   - Network: Named bridge network for inter-container communication
   - Health checks configured for all services

5. **`vector.toml`** - Vector configuration for local testing
   - GraphQL API enabled on port 8686
   - Example internal logs source
   - Console sink for output

### AWS ECS Deployment
6. **`ecs/task-definition.json`** - ECS task definition template
   - Family: `vector-with-dashboard`
   - Launch type: FARGATE
   - CPU: 512, Memory: 1024
   - Three containers: Vector, Dashboard Backend, Dashboard Frontend
   - CloudWatch Logs configured for all containers
   - Container dependencies configured (proper startup order)
   - Task role and execution role ARNs (placeholders for customization)

### Deployment & Documentation
7. **`DEPLOYMENT.md`** - Comprehensive deployment guide
   - Local development setup instructions
   - Troubleshooting guide
   - AWS ECS deployment steps
   - ECR login and image push procedures
   - Task definition registration
   - Service creation and update commands
   - Environment variable documentation
   - ALB configuration
   - Scaling guidance
   - Verification checklist

8. **`scripts/deploy.sh`** - Automated deployment script
   - Builds backend and frontend images
   - Pushes images to ECR
   - Registers new task definition
   - Updates ECS service with force-new-deployment
   - Usage: `AWS_ACCOUNT=123456789012 ./scripts/deploy.sh [dev|prod] [image-tag]`

## Files Modified

### Backend
- **`backend/src/index.ts`** 
  - Imports `getConfig` from `config.ts`
  - Uses config values for `VECTOR_API`, `PORT`, and `CORS_ORIGIN`
  - Removed hardcoded localhost references

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         AWS ECS Task (or docker-compose)           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │   Vector     │  │   Dashboard  │               │
│  │  :8686       │  │   Backend    │               │
│  │  (GraphQL)   │  │   :3001      │               │
│  │              │  │  (localhost) │               │
│  └──────────────┘  └──────────────┘               │
│         ↑                ↑                         │
│         └────localhost───┘                        │
│                                                   │
│  ┌──────────────────────────────────┐            │
│  │  Dashboard Frontend               │            │
│  │  :3000 (nginx)                    │            │
│  │  → Connects to :3001 backend      │            │
│  └──────────────────────────────────┘            │
│                 ↓                                  │
└─────────────────┼──────────────────────────────────┘
                  │
              ALB :3000
                  │
            Browser/Client
```

## Quick Start Guide

### Local Development
```bash
cd /home/josh/vector-dashboard

# Start all services
docker-compose up

# Open dashboard
open http://localhost:3000

# Verify Vector connectivity
curl http://localhost:3001/health
```

### AWS Deployment
```bash
# Build and push to ECR
export AWS_ACCOUNT=YOUR_ACCOUNT_ID
./scripts/deploy.sh dev latest

# Or manually:
docker build -f Dockerfile.backend -t vector-dashboard-backend:latest .
docker tag vector-dashboard-backend:latest $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/vector-dashboard-backend:latest
docker push $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/vector-dashboard-backend:latest
# (repeat for frontend)

# Register task definition and update service
aws ecs register-task-definition --cli-input-json file://ecs/task-definition.json
aws ecs update-service --cluster your-cluster --service vector-dashboard --force-new-deployment
```

## Configuration

### Environment Variables
Set these in the ECS task definition or docker-compose:

| Variable | Default | Container | Purpose |
|----------|---------|-----------|---------|
| `VECTOR_API` | `http://localhost:8686` | Backend | Vector GraphQL endpoint |
| `PORT` | `3001` | Backend | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Backend | CORS allowed origin |

### Network Architecture
- **Sidecar pattern**: Dashboard and Vector in same task → localhost network
- **No discovery needed**: Backend always uses `http://localhost:8686`
- **Simple scaling**: Each Vector replica gets its own dashboard instance
- **ALB routing**: Single ALB routes to port 3000 across all task replicas

## Verification

### Local
```bash
# All services running
docker-compose ps

# Backend health
curl http://localhost:3001/health

# Vector API
curl -X POST http://localhost:8686/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health }"}'

# Frontend loads
curl http://localhost:3000
```

### AWS
```bash
# Task status
aws ecs describe-services --cluster your-cluster --services vector-dashboard

# Logs
aws logs tail /ecs/vector-dashboard --follow

# ALB health
aws elbv2 describe-target-health --target-group-arn arn:aws:...
```

## Next Steps

1. **Customize Configuration**
   - Update `CORS_ORIGIN` in task definition to your domain
   - Adjust CPU/memory in task definition based on load
   - Configure CloudWatch log groups

2. **Deploy to ECS**
   - Update AWS account ID and region in scripts
   - Create/update ECS cluster, service, ALB
   - Configure DNS to point to ALB

3. **Monitor & Scale**
   - View CloudWatch logs
   - Scale service with `aws ecs update-service --desired-count N`
   - Set up CloudWatch alarms

4. **Test Features**
   - Access dashboard via ALB domain
   - Verify WebSocket connection (DevTools Network → WS)
   - Test topology visualization and metrics
   - Verify tap functionality

## Key Design Decisions

✅ **Sidecar pattern** - One dashboard per Vector instance (vs. centralized)
✅ **Localhost only** - No service discovery needed, simpler config
✅ **Bun + Node/nginx** - Lightweight, familiar tooling
✅ **Health checks** - All containers have health endpoints
✅ **Environment config** - Flexible deployment across dev/prod
✅ **Docker Compose first** - Test locally before AWS

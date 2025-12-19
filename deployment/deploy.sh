#!/bin/bash

# =====================================================
# EdForce Production Deployment Script
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  EdForce Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running from project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please copy deployment/.env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
set -a
source .env.production
set +a

echo -e "${BLUE}Step 1: Pulling latest code...${NC}"
git pull origin main || echo -e "${YELLOW}Warning: Git pull failed or not a git repository${NC}"

echo ""
echo -e "${BLUE}Step 2: Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo -e "${BLUE}Step 3: Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down

echo ""
echo -e "${BLUE}Step 4: Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${BLUE}Step 5: Waiting for services to be healthy...${NC}"
echo "Waiting for PostgreSQL..."
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${DATABASE_USERNAME:-postgres} -d ${DATABASE_NAME:-edforce_db} > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

echo "Waiting for Redis..."
until docker compose -f docker-compose.prod.yml exec -T redis redis-cli -a ${REDIS_PASSWORD} ping > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}✓ Redis is ready${NC}"

echo "Waiting for Backend..."
sleep 10
until docker compose -f docker-compose.prod.yml exec -T backend wget -q --spider http://localhost:3000/api/health > /dev/null 2>&1; do
    sleep 3
done
echo -e "${GREEN}✓ Backend is ready${NC}"

echo "" 
echo -e "${BLUE}Step 6: Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T backend npm run migration:run:prod || echo -e "${YELLOW}Warning: Migrations may have already been applied${NC}"

echo ""
echo -e "${BLUE}Step 7: Checking service status...${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your application is now running at:"
echo -e "  Frontend: https://edforce.live"
echo -e "  API:      https://api.edforce.live/api"
echo -e "  API Docs: https://api.edforce.live/api/docs"
echo ""
echo -e "To view logs:"
echo -e "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "To view specific service logs:"
echo -e "  docker compose -f docker-compose.prod.yml logs -f backend"
echo -e "  docker compose -f docker-compose.prod.yml logs -f frontend"
echo -e "  docker compose -f docker-compose.prod.yml logs -f nginx"

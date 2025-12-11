#!/bin/bash

# =====================================================
# EdForce Quick Health Check Script
# =====================================================

echo "EdForce Health Check"
echo "===================="

# Check Docker
echo -n "Docker: "
if docker --version > /dev/null 2>&1; then
    echo "✓ Installed"
else
    echo "✗ Not installed"
    exit 1
fi

# Check containers
echo ""
echo "Container Status:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker Compose not running"

# Check endpoints
echo ""
echo "Endpoint Checks:"

echo -n "  Frontend (https://edforce.live): "
if curl -s -o /dev/null -w "%{http_code}" https://edforce.live | grep -q "200\|301\|302"; then
    echo "✓ OK"
else
    echo "✗ Failed"
fi

echo -n "  API Health (https://api.edforce.live/api/health): "
if curl -s https://api.edforce.live/api/health | grep -q "status"; then
    echo "✓ OK"
else
    echo "✗ Failed"
fi

echo -n "  API Docs (https://api.edforce.live/api/docs): "
if curl -s -o /dev/null -w "%{http_code}" https://api.edforce.live/api/docs | grep -q "200\|301"; then
    echo "✓ OK"
else
    echo "✗ Failed"
fi

# SSL Check
echo ""
echo "SSL Certificate:"
echo | openssl s_client -servername edforce.live -connect edforce.live:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "Could not check SSL"

echo ""
echo "Disk Usage:"
df -h / | tail -1

echo ""
echo "Memory Usage:"
free -h | grep Mem

echo ""
echo "Health check complete!"

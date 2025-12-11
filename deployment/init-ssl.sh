#!/bin/bash

# =====================================================
# EdForce SSL Certificate Initialization Script
# Run this ONCE on your VPS to obtain SSL certificates
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  EdForce SSL Certificate Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please copy deployment/.env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
source .env.production

# Validate required variables
if [ -z "$SSL_EMAIL" ]; then
    echo -e "${RED}Error: SSL_EMAIL not set in .env.production${NC}"
    exit 1
fi

if [ -z "$DOMAIN" ]; then
    DOMAIN="edforce.live"
fi

if [ -z "$API_DOMAIN" ]; then
    API_DOMAIN="api.edforce.live"
fi

DOMAINS="-d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN"

echo -e "${YELLOW}Domains: $DOMAIN, www.$DOMAIN, $API_DOMAIN${NC}"
echo -e "${YELLOW}Email: $SSL_EMAIL${NC}"
echo ""

# Create required directories
echo -e "${GREEN}Creating certificate directories...${NC}"
mkdir -p deployment/certbot/www
mkdir -p deployment/certbot/conf

# Download recommended TLS parameters
if [ ! -f "deployment/certbot/conf/options-ssl-nginx.conf" ]; then
    echo -e "${GREEN}Downloading recommended TLS parameters...${NC}"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > deployment/certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "deployment/certbot/conf/ssl-dhparams.pem" ]; then
    echo -e "${GREEN}Downloading DH parameters...${NC}"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > deployment/certbot/conf/ssl-dhparams.pem
fi

# Use initial nginx config without SSL
echo -e "${GREEN}Setting up initial nginx configuration...${NC}"
cp deployment/nginx/conf.d/default.conf deployment/nginx/conf.d/default.conf.ssl.bak 2>/dev/null || true
cp deployment/nginx/conf.d/default.conf.initial deployment/nginx/conf.d/default.conf

# Force restart nginx with HTTP-only config for ACME challenge
echo -e "${GREEN}Starting nginx for ACME challenge (HTTP only)...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate nginx

# Wait for nginx to be ready
echo -e "${YELLOW}Waiting for nginx to start...${NC}"
sleep 5

# Verify nginx config is HTTP-only (no SSL blocks)
echo -e "${GREEN}Verifying nginx is using HTTP-only config...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -T 2>&1 | grep -q "listen 443" && echo -e "${RED}WARNING: Nginx still has SSL config!${NC}" || echo -e "${GREEN}✓ Nginx is using HTTP-only config${NC}"

# Verify nginx is serving ACME challenge path
echo -e "${GREEN}Verifying ACME challenge path is accessible...${NC}"
mkdir -p deployment/certbot/www/.well-known/acme-challenge
echo "test-$(date +%s)" > deployment/certbot/www/.well-known/acme-challenge/test.txt

# Test ACME path locally
ACME_TEST=$(docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx curl -s http://localhost/.well-known/acme-challenge/test.txt 2>/dev/null || echo "FAILED")
if [ "$ACME_TEST" != "FAILED" ]; then
    echo -e "${GREEN}✓ ACME challenge path is accessible locally${NC}"
else
    echo -e "${YELLOW}Note: Could not verify ACME path internally (curl may not be installed in nginx container)${NC}"
fi

# Request certificates
echo -e "${GREEN}Requesting SSL certificates from Let's Encrypt...${NC}"
echo -e "${YELLOW}This may take a minute...${NC}"
echo -e "${YELLOW}Domains: $DOMAINS${NC}"

# Run certbot with verbose output - override entrypoint since compose has a renewal loop entrypoint
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint "" certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $SSL_EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --verbose \
    $DOMAINS

CERTBOT_EXIT=$?
echo -e "${YELLOW}Certbot exit code: $CERTBOT_EXIT${NC}"

# Check if certificates were created successfully
if [ -d "deployment/certbot/conf/live/$DOMAIN" ]; then
    echo -e "${GREEN}✓ SSL certificates obtained successfully!${NC}"
    
    # Restore full SSL configuration
    echo -e "${GREEN}Restoring full SSL nginx configuration...${NC}"
    cp deployment/nginx/conf.d/default.conf.bak deployment/nginx/conf.d/default.conf.initial.bak
    # The full default.conf already exists, just reload
    
    # Copy back the full SSL config
    cat > deployment/nginx/conf.d/default.conf << 'NGINX_CONF'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name edforce.live www.edforce.live;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://edforce.live$request_uri;
    }
}

# HTTPS - www redirect to non-www
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.edforce.live;

    ssl_certificate /etc/letsencrypt/live/edforce.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edforce.live/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://edforce.live$request_uri;
}

# HTTPS - Main Frontend Server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name edforce.live;

    ssl_certificate /etc/letsencrypt/live/edforce.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edforce.live/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_intercept_errors on;
        error_page 404 = /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API Server - HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.edforce.live;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://api.edforce.live$request_uri;
    }
}

# API Server - HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name api.edforce.live;

    ssl_certificate /etc/letsencrypt/live/edforce.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edforce.live/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS headers handled by backend, not nginx

    limit_req zone=api_limit burst=20 nodelay;

    # Preflight OPTIONS requests
    location @cors_preflight {
        add_header Access-Control-Allow-Origin "https://edforce.live" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With, Accept, Origin" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "86400" always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    location ~ ^/api/auth/(login|register) {
        limit_req zone=login_limit burst=5 nodelay;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api {
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api/health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        return 301 https://api.edforce.live/api$request_uri;
    }
}
NGINX_CONF
    
    # Reload nginx with new SSL configuration
    echo -e "${GREEN}Reloading nginx with SSL configuration...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  SSL Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Your sites are now secured with SSL:"
    echo -e "  - https://edforce.live"
    echo -e "  - https://www.edforce.live"
    echo -e "  - https://api.edforce.live"
    echo ""
    echo -e "Certificates will auto-renew via the certbot container."
    
else
    echo -e "${RED}Error: SSL certificate generation failed!${NC}"
    echo "Check the certbot logs for more details."
    exit 1
fi

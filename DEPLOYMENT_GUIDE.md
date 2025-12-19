# EdForce Production Deployment Guide

This comprehensive guide will help you deploy EdForce to your Hostinger VPS with the domain `edforce.live`.

## 📋 Prerequisites

- **VPS**: Ubuntu 20.04/22.04 LTS (Hostinger VPS)
- **Domain**: `edforce.live` with DNS configured
- **DNS Records** (already configured):
  - `A` record: `edforce.live` → Your VPS IP
  - `A` record: `www.edforce.live` → Your VPS IP
  - `A` record: `api.edforce.live` → Your VPS IP

## 🏗️ Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    Hostinger VPS                         │
                    │                                                          │
    Internet        │  ┌─────────┐                                            │
        │           │  │  Nginx  │──────┬─────────────────────────────────┐   │
        │           │  │  :80    │      │                                 │   │
        ▼           │  │  :443   │      ▼                                 ▼   │
   ┌─────────┐      │  └────┬────┘   ┌──────────┐   ┌─────────┐   ┌───────────┐
   │ Users   │──────┼───────┤        │ Frontend │   │ Backend │   │PostgreSQL │
   │         │      │       │        │  :80     │   │  :3000  │   │   :5432   │
   └─────────┘      │       │        └──────────┘   └────┬────┘   └───────────┘
                    │       │                            │
   edforce.live     │       │                            │        ┌───────────┐
   www.edforce.live │       │                            ├────────│   Redis   │
   api.edforce.live │       │                            │        │   :6379   │
                    │       │                            │        └───────────┘
                    │       │        ┌─────────┐         │
                    │       └────────│ Certbot │         │        ┌───────────┐
                    │                │  (SSL)  │         └────────│Elasticsearch
                    │                └─────────┘                  │   :9200   │
                    │                                             └───────────┘
                    └──────────────────────────────────────────────────────────┘
```

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Run VPS Setup Script

First, let's set up the VPS with Docker and required packages:

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/CourseConnectA/EdForce/main/deployment/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

Or manually run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release git ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Create application user
useradd -m -s /bin/bash -G docker edforce

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Create swap space (if VPS has limited RAM)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
```

### Step 3: Clone the Repository

```bash
# Switch to edforce user
su - edforce

# Create and navigate to application directory
mkdir -p /opt/edforce
cd /opt/edforce

# Clone the repository
git clone https://github.com/CourseConnectA/EdForce.git .
```

### Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp deployment/.env.production.example .env.production

# Edit the environment file with your values
nano .env.production
```

**IMPORTANT**: Update these values in `.env.production`:

```env
# Database - Use strong passwords!
DATABASE_NAME=edforce_db
DATABASE_USERNAME=edforce_user
DATABASE_PASSWORD=YOUR_SUPER_SECURE_DATABASE_PASSWORD_HERE
# Use SSL only for managed/external DBs (not Docker internal)
DATABASE_SSL=false

# Redis - Use a strong password!
REDIS_PASSWORD=YOUR_SUPER_SECURE_REDIS_PASSWORD_HERE

# JWT Secrets - Generate with: openssl rand -base64 64
JWT_SECRET=GENERATE_A_64_CHAR_RANDOM_STRING_HERE
JWT_REFRESH_SECRET=GENERATE_ANOTHER_64_CHAR_RANDOM_STRING_HERE

# SSL Certificate Email
SSL_EMAIL=your-actual-email@example.com

# Domain Configuration
DOMAIN=edforce.live
API_DOMAIN=api.edforce.live
```

**Generate secure passwords:**

```bash
# Generate random passwords
openssl rand -base64 32  # For database password
openssl rand -base64 32  # For Redis password
openssl rand -base64 64  # For JWT secret
openssl rand -base64 64  # For JWT refresh secret
```

### Step 5: Initialize SSL Certificates

```bash
# Make scripts executable
chmod +x deployment/*.sh

# Initialize SSL certificates (run only once)
./deployment/init-ssl.sh
```

This script will:
1. Start Nginx temporarily for the ACME challenge
2. Request SSL certificates from Let's Encrypt
3. Configure Nginx with full SSL support
4. Set up automatic certificate renewal

### Step 6: Deploy the Application

```bash
# Run the deployment script
./deployment/deploy.sh
```

Or manually:

```bash
# Build all Docker images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Run database migrations
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migration:run:prod

# Check status
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

### Step 7: Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# View logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Test the API
curl https://api.edforce.live/api/health

# Test the frontend
curl -I https://edforce.live
```

## 🔧 Configuration Files

### Docker Compose Production (`docker-compose.prod.yml`)

The production Docker Compose file includes:
- **PostgreSQL**: Database with persistent storage
- **Redis**: Caching and session management (password protected)
- **Elasticsearch**: Search functionality (optional)
- **Backend**: NestJS API server
- **Frontend**: React app served via Nginx
- **Nginx**: Reverse proxy with SSL termination
- **Certbot**: Automatic SSL certificate renewal

### Nginx Configuration

- **Frontend**: `https://edforce.live` and `https://www.edforce.live`
- **API**: `https://api.edforce.live`
- **WebSocket**: `wss://api.edforce.live/socket.io`

### CORS Configuration

CORS is configured in both the backend and Nginx to allow:
- `https://edforce.live`
- `https://www.edforce.live`
- `https://api.edforce.live`

## 📊 Managing the Application

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Specific service
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f frontend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f postgres
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml --env-file .env.production restart

# Restart specific service
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
./deployment/deploy.sh
```

### Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_dump -U edforce_user edforce_db > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20231215.sql | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U edforce_user edforce_db
```

### SSL Certificate Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload
```

## 🛡️ Security Checklist

- [ ] Change all default passwords in `.env.production`
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Fail2ban enabled for SSH protection
- [ ] SSL certificates installed and auto-renewing
- [ ] Database not exposed to internet (internal network only)
- [ ] Redis password protected
- [ ] Rate limiting enabled on API endpoints

## 🐛 Troubleshooting

### Container Not Starting

```bash
# Check container logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend

# Check container status
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_isready

# Test connection
docker compose -f docker-compose.prod.yml exec backend node -e "const { Client } = require('pg'); const c = new Client({host:'postgres',user:'edforce_user',password:'YOUR_PASSWORD',database:'edforce_db'}); c.connect().then(()=>console.log('Connected!')).catch(e=>console.error(e))"
```

### SSL Certificate Issues

```bash
# Check certificate status
docker compose -f docker-compose.prod.yml run --rm certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

### CORS Errors

1. Check the browser console for the exact CORS error
2. Verify the origin is in the allowed list in:
   - Backend: `CORS_ORIGIN` environment variable
   - Nginx: `Access-Control-Allow-Origin` headers
3. Restart nginx after any changes:
   ```bash
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

### 502 Bad Gateway

Usually means the backend isn't running:

```bash
# Check backend status
docker compose -f docker-compose.prod.yml --env-file .env.production ps backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend

# Restart backend
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

## 📁 Directory Structure

```
/opt/edforce/
├── .env.production           # Production environment variables
├── docker-compose.prod.yml   # Production Docker Compose
├── backend/                  # Backend source code
├── frontend/                 # Frontend source code
├── shared/                   # Shared types
├── database/                 # Database initialization
└── deployment/
    ├── .env.production.example
    ├── deploy.sh             # Deployment script
    ├── init-ssl.sh           # SSL initialization
    ├── setup-vps.sh          # VPS setup script
    ├── nginx/
    │   ├── nginx.conf
    │   └── conf.d/
    │       └── default.conf
    └── certbot/
        ├── conf/             # SSL certificates
        └── www/              # ACME challenge
```

## 🎯 Quick Reference Commands

```bash
# Deploy
./deployment/deploy.sh

# View status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# View logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Stop all
docker compose -f docker-compose.prod.yml down

# Restart all
docker compose -f docker-compose.prod.yml --env-file .env.production restart

# Shell into container
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend sh
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres psql -U edforce_user edforce_db

# Update and redeploy
git pull && ./deployment/deploy.sh
```

## 📞 Support

If you encounter issues:
1. Check the logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Verify environment variables in `.env.production`
3. Ensure DNS is properly configured
4. Check firewall rules: `ufw status`

---

**Your application will be available at:**
- 🌐 Frontend: https://edforce.live
- 🔌 API: https://api.edforce.live/api
- 📚 API Docs: https://api.edforce.live/api/docs

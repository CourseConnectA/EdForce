#!/bin/bash

# =====================================================
# EdForce VPS Initial Setup Script
# Run this script on a fresh Ubuntu VPS
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  EdForce VPS Initial Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run this script as root or with sudo${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${BLUE}Step 2: Installing required packages...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban

echo ""
echo -e "${BLUE}Step 3: Installing Docker...${NC}"
# Remove old Docker versions if present
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

echo -e "${GREEN}✓ Docker installed successfully${NC}"
docker --version
docker compose version

echo ""
echo -e "${BLUE}Step 4: Creating edforce user...${NC}"
# Create a user for running the application
if ! id "edforce" &>/dev/null; then
    useradd -m -s /bin/bash -G docker edforce
    echo -e "${GREEN}✓ User 'edforce' created${NC}"
else
    echo -e "${YELLOW}User 'edforce' already exists${NC}"
fi

# Add edforce to docker group
usermod -aG docker edforce

echo ""
echo -e "${BLUE}Step 5: Configuring firewall...${NC}"
# Configure UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"

echo ""
echo -e "${BLUE}Step 6: Configuring fail2ban...${NC}"
# Configure fail2ban for SSH protection
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban
echo -e "${GREEN}✓ Fail2ban configured${NC}"

echo ""
echo -e "${BLUE}Step 7: Setting up swap space (if not present)...${NC}"
if [ ! -f /swapfile ]; then
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo -e "${GREEN}✓ 2GB swap file created${NC}"
else
    echo -e "${YELLOW}Swap file already exists${NC}"
fi

echo ""
echo -e "${BLUE}Step 8: Creating application directory...${NC}"
mkdir -p /opt/edforce
chown edforce:edforce /opt/edforce
echo -e "${GREEN}✓ Directory /opt/edforce created${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VPS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Clone your repository:"
echo -e "   ${BLUE}su - edforce${NC}"
echo -e "   ${BLUE}cd /opt/edforce${NC}"
echo -e "   ${BLUE}git clone https://github.com/CourseConnectA/EdForce.git .${NC}"
echo ""
echo -e "2. Configure environment:"
echo -e "   ${BLUE}cp deployment/.env.production.example .env.production${NC}"
echo -e "   ${BLUE}nano .env.production${NC}  # Edit with your values"
echo ""
echo -e "3. Initialize SSL certificates:"
echo -e "   ${BLUE}chmod +x deployment/*.sh${NC}"
echo -e "   ${BLUE}./deployment/init-ssl.sh${NC}"
echo ""
echo -e "4. Deploy the application:"
echo -e "   ${BLUE}./deployment/deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Remember to set strong passwords in .env.production!${NC}"

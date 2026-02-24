#!/bin/bash
# ============================================
# Training Management System - Deploy Script
# For Kamatera Ubuntu Server
# Server: 79.108.224.58
# ============================================

set -e

echo "🚀 Training Management System - Deployment"
echo "============================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
REPO_URL="https://github.com/Jsolersafety/Training_matrix.git"
APP_DIR="/opt/training-matrix"
DOMAIN="${DOMAIN:-79.108.224.58}"

# ── Step 1: Install dependencies ─────────────────────────────
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
apt-get update -qq
apt-get install -y -qq docker.io docker-compose git curl

# Start Docker
systemctl enable docker
systemctl start docker

# ── Step 2: Clone or update repo ────────────────────────────
echo -e "${YELLOW}Step 2: Setting up application...${NC}"
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || true
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── Step 3: Create .env file ────────────────────────────────
echo -e "${YELLOW}Step 3: Configuring environment...${NC}"
if [ ! -f .env ]; then
    SECRET=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)
    cat > .env << EOF
# Database
POSTGRES_DB=training_matrix
POSTGRES_USER=training_app
POSTGRES_PASSWORD=${DB_PASS}

# Backend
SECRET_KEY=${SECRET}
CORS_ORIGINS=http://${DOMAIN},https://${DOMAIN}
ENVIRONMENT=production

# Frontend
VITE_API_URL=/api

# SSL
DOMAIN=${DOMAIN}
EMAIL=admin@cookshire.qld.gov.au
EOF
    echo -e "${GREEN}Created .env with secure credentials${NC}"
else
    echo -e "${GREEN}.env already exists, keeping existing config${NC}"
fi

# ── Step 4: Build and start containers ───────────────────────
echo -e "${YELLOW}Step 4: Building and starting containers...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# ── Step 5: Wait for services ────────────────────────────────
echo -e "${YELLOW}Step 5: Waiting for services to start...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}Checking service health...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health | grep -q "ok"; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    sleep 2
done

if curl -s http://localhost:80 | grep -q "Training"; then
    echo -e "${GREEN}✅ Frontend is serving${NC}"
fi

# ── Step 6: SSL Setup (optional) ────────────────────────────
echo ""
echo -e "${YELLOW}Step 6: SSL Certificate${NC}"
echo "To enable HTTPS, run:"
echo "  docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d YOUR_DOMAIN --email YOUR_EMAIL --agree-tos --no-eff-email"
echo "Then uncomment the HTTPS server block in nginx/conf.d/default.conf"
echo ""

# ── Done ─────────────────────────────────────────────────────
echo "============================================"
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "  🌐 Application: http://${DOMAIN}"
echo "  🔧 API Docs:    http://${DOMAIN}/api/docs"
echo "  🐘 Database:    localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose restart          # Restart all"
echo "  docker-compose down             # Stop all"
echo "  docker-compose exec db psql -U training_app training_matrix  # DB shell"
echo "============================================"

#!/bin/bash
# ============================================
# Setup SSH Key for GitHub Actions CI/CD
# Run this on your LOCAL machine or Kamatera server
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER_IP="79.108.224.58"
REPO="Jsolersafety/Training_matrix"

echo "============================================"
echo -e "${CYAN}GitHub Actions CI/CD Setup${NC}"
echo "============================================"
echo ""

# Step 1: Generate SSH key pair
echo -e "${YELLOW}Step 1: Generating SSH key pair...${NC}"
KEY_FILE="$HOME/.ssh/kamatera_deploy"

if [ -f "$KEY_FILE" ]; then
    echo -e "${GREEN}Key already exists at $KEY_FILE${NC}"
else
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$KEY_FILE" -N ""
    echo -e "${GREEN}Key pair generated${NC}"
fi

echo ""
echo "============================================"
echo -e "${YELLOW}Step 2: Add PUBLIC key to Kamatera server${NC}"
echo "============================================"
echo ""
echo "Run this command to copy the key to your server:"
echo ""
echo -e "${CYAN}ssh-copy-id -i ${KEY_FILE}.pub root@${SERVER_IP}${NC}"
echo ""
echo "Or manually add this to /root/.ssh/authorized_keys on the server:"
echo ""
echo -e "${GREEN}$(cat ${KEY_FILE}.pub)${NC}"
echo ""

echo "============================================"
echo -e "${YELLOW}Step 3: Add SECRETS to GitHub${NC}"
echo "============================================"
echo ""
echo "Go to: https://github.com/${REPO}/settings/secrets/actions"
echo ""
echo "Add these 3 secrets:"
echo ""
echo -e "${CYAN}Secret 1: SERVER_IP${NC}"
echo "Value: ${SERVER_IP}"
echo ""
echo -e "${CYAN}Secret 2: SERVER_USER${NC}"
echo "Value: root"
echo ""
echo -e "${CYAN}Secret 3: SSH_PRIVATE_KEY${NC}"
echo "Value: (paste the ENTIRE content below, including BEGIN/END lines)"
echo ""
echo -e "${GREEN}$(cat ${KEY_FILE})${NC}"
echo ""

echo "============================================"
echo -e "${YELLOW}Step 4: Verify${NC}"
echo "============================================"
echo ""
echo "Test SSH connection:"
echo -e "${CYAN}ssh -i ${KEY_FILE} root@${SERVER_IP} 'echo Connected!'${NC}"
echo ""
echo "After adding all 3 secrets to GitHub, any push to main/master"
echo "will auto-deploy to your Kamatera server."
echo ""
echo "You can also trigger manually from:"
echo "https://github.com/${REPO}/actions → Deploy to Kamatera → Run workflow"
echo "============================================"

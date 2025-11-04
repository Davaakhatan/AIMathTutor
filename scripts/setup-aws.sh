#!/bin/bash

# AWS Setup Script for AI Math Tutor
# This script helps set up AWS resources for deployment

set -e

echo "🔧 AWS Setup Script for AI Math Tutor"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS CLI is not installed.${NC}"
    echo "Please install it first: https://aws.amazon.com/cli/"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI found${NC}"

# Check AWS credentials
echo -e "\n${BLUE}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS credentials not configured.${NC}"
    echo "Please run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}✓ AWS credentials configured${NC}"
echo -e "${BLUE}Account ID: $ACCOUNT_ID${NC}"
echo -e "${BLUE}Region: $REGION${NC}"

echo -e "\n${BLUE}Choose deployment method:${NC}"
echo "1) AWS Amplify (Recommended - Easiest)"
echo "2) AWS App Runner (Container-based)"
echo "3) Manual setup instructions"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo -e "\n${BLUE}Setting up AWS Amplify...${NC}"
        echo ""
        echo "To set up AWS Amplify:"
        echo "1. Go to: https://console.aws.amazon.com/amplify"
        echo "2. Click 'New app' → 'Host web app'"
        echo "3. Connect your GitHub repository: Davaakhatan/AIMathTutor"
        echo "4. Select branch: main"
        echo "5. Use the amplify.yml file in the repo"
        echo "6. Add environment variable: OPENAI_API_KEY"
        echo ""
        echo "After setup, get your App ID and add it as a GitHub secret:"
        echo "  - AMPLIFY_APP_ID"
        ;;
    2)
        echo -e "\n${BLUE}Setting up AWS App Runner...${NC}"
        
        # Check if ECR repository exists
        REPO_NAME="aitutor"
        echo "Creating ECR repository..."
        
        if aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION &> /dev/null; then
            echo -e "${GREEN}✓ ECR repository already exists${NC}"
        else
            aws ecr create-repository --repository-name $REPO_NAME --region $REGION
            echo -e "${GREEN}✓ ECR repository created${NC}"
        fi
        
        REPO_URI=$(aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
        
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo "1. Build and push Docker image:"
        echo "   docker build -t $REPO_NAME ."
        echo "   aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
        echo "   docker tag $REPO_NAME:latest $REPO_URI:latest"
        echo "   docker push $REPO_URI:latest"
        echo ""
        echo "2. Create App Runner service from ECR image"
        echo "3. Set environment variable: OPENAI_API_KEY"
        ;;
    3)
        echo -e "\n${BLUE}Manual Setup Instructions:${NC}"
        echo ""
        echo "See AWS_DEPLOYMENT.md for detailed instructions"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Setup complete!${NC}"


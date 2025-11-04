#!/bin/bash

# AWS Deployment Script for AI Math Tutor
# This script automates deployment to AWS Amplify

set -e

echo "🚀 Starting AWS Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured.${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${BLUE}✓ AWS CLI configured${NC}"

# Check for required environment variables
if [ -z "$AMPLIFY_APP_ID" ]; then
    echo -e "${RED}❌ AMPLIFY_APP_ID environment variable not set${NC}"
    echo "Set it with: export AMPLIFY_APP_ID=your-app-id"
    exit 1
fi

BRANCH_NAME=${BRANCH_NAME:-main}
APP_ID=$AMPLIFY_APP_ID

echo -e "${BLUE}App ID: $APP_ID${NC}"
echo -e "${BLUE}Branch: $BRANCH_NAME${NC}"

# Start deployment
echo -e "\n${BLUE}Starting deployment...${NC}"
JOB_ID=$(aws amplify start-job \
    --app-id $APP_ID \
    --branch-name $BRANCH_NAME \
    --job-type RELEASE \
    --query 'jobSummary.jobId' \
    --output text)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Failed to start deployment${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Deployment started${NC}"
echo -e "${BLUE}Job ID: $JOB_ID${NC}"

# Wait for deployment
echo -e "\n${BLUE}Waiting for deployment to complete...${NC}"
while true; do
    STATUS=$(aws amplify get-job \
        --app-id $APP_ID \
        --branch-name $BRANCH_NAME \
        --job-id $JOB_ID \
        --query 'job.summary.status' \
        --output text 2>/dev/null || echo "PENDING")
    
    case $STATUS in
        "SUCCEED")
            echo -e "\n${GREEN}✅ Deployment successful!${NC}"
            
            # Get app URL
            APP_URL=$(aws amplify get-app \
                --app-id $APP_ID \
                --query 'app.defaultDomain' \
                --output text)
            
            echo -e "${GREEN}App URL: https://$BRANCH_NAME.$APP_URL${NC}"
            exit 0
            ;;
        "FAILED"|"CANCELLED")
            echo -e "\n${RED}❌ Deployment failed with status: $STATUS${NC}"
            echo "Check AWS Amplify console for details"
            exit 1
            ;;
        *)
            echo -n "."
            sleep 5
            ;;
    esac
done


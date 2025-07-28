#!/bin/bash

# Get API endpoint from deployed stack
# Useful for local development and debugging

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if environment is provided
if [ -z "$1" ]; then
    echo -e "${RED}[ERROR]${NC} Environment not specified. Usage: ./get-api-endpoint.sh [dev|staging|prod]"
    exit 1
fi

ENV=$1
PROJECT_NAME=${PROJECT_NAME:-$(grep PROJECT_NAME .env | cut -d '=' -f2)}
AWS_REGION=${AWS_REGION:-$(grep AWS_REGION .env | cut -d '=' -f2 || echo "ap-northeast-1")}

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}[ERROR]${NC} PROJECT_NAME not found in environment or .env file"
    exit 1
fi

STACK_NAME="${PROJECT_NAME}-${ENV}"

echo -e "${GREEN}[INFO]${NC} Getting API endpoint for ${STACK_NAME}..."

# Get API endpoint from CloudFormation stack
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
    echo -e "${RED}[ERROR]${NC} Could not retrieve API endpoint from stack ${STACK_NAME}"
    echo "Make sure the stack is deployed and you have the correct AWS credentials"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} API Endpoint: ${API_ENDPOINT}"

# Also get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ ! -z "$CLOUDFRONT_URL" ]; then
    echo -e "${GREEN}[INFO]${NC} CloudFront URL: ${CLOUDFRONT_URL}"
fi

# Ask if user wants to update local api-config.js
echo ""
read -p "Do you want to update your local frontend/js/api-config.js? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > frontend/js/api-config.js << EOF
// Auto-generated - DO NOT EDIT
window.API_CONFIG = {
  apiEndpoint: '${API_ENDPOINT}',
  isManaged: true
};
EOF
    echo -e "${GREEN}[INFO]${NC} Updated frontend/js/api-config.js"
fi
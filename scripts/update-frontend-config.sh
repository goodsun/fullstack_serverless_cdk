#!/bin/bash

# Update frontend configuration with API endpoint after deployment
# This script is called after CDK deployment to update the api-config.js file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Environment not specified. Usage: ./update-frontend-config.sh [dev|staging|prod]"
    exit 1
fi

ENV=$1
PROJECT_NAME=${PROJECT_NAME:-$(grep PROJECT_NAME .env | cut -d '=' -f2)}
AWS_REGION=${AWS_REGION:-$(grep AWS_REGION .env | cut -d '=' -f2 || echo "ap-northeast-1")}

if [ -z "$PROJECT_NAME" ]; then
    print_error "PROJECT_NAME not found in environment or .env file"
    exit 1
fi

# Convert project name to PascalCase for stack name (matching CDK)
STACK_PREFIX=$(echo $PROJECT_NAME | awk -F'-' '{for(i=1;i<=NF;i++){$i=toupper(substr($i,1,1)) substr($i,2)}}1' | sed 's/ //g')
# Capitalize environment name
ENV_SUFFIX=$(echo $ENV | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
STACK_NAME="${STACK_PREFIX}-${ENV_SUFFIX}"
BUCKET_NAME="${PROJECT_NAME}-frontend-${ENV}"

print_status "Updating frontend configuration for ${STACK_NAME}..."

# Check if API_ENDPOINT is provided as environment variable first
if [ -n "$API_ENDPOINT" ]; then
    print_status "Using API endpoint from environment variable: ${API_ENDPOINT}"
else
    # Get API endpoint from CloudFormation stack
    print_status "Getting API endpoint from CloudFormation stack..."
    API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    if [ -z "$API_ENDPOINT" ]; then
        print_error "Could not retrieve API endpoint from stack ${STACK_NAME}"
        exit 1
    fi
fi

print_status "Found API endpoint: ${API_ENDPOINT}"

# Create updated api-config.js
cat > frontend/js/api-config.js << EOF
// Auto-generated during deployment - DO NOT EDIT
window.API_CONFIG = {
  apiEndpoint: '${API_ENDPOINT}',
  isManaged: true
};
EOF

print_status "Updated frontend/js/api-config.js"

# Upload only the updated api-config.js to S3
print_status "Uploading updated configuration to S3..."
aws s3 cp frontend/js/api-config.js s3://${BUCKET_NAME}/js/api-config.js \
    --region $AWS_REGION \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "application/javascript"

if [ $? -eq 0 ]; then
    print_status "Successfully uploaded api-config.js to S3"
else
    print_error "Failed to upload api-config.js to S3"
    exit 1
fi

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    print_status "Creating CloudFront invalidation for distribution ${DISTRIBUTION_ID}..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/js/api-config.js" \
        --query 'Invalidation.Id' \
        --output text \
        --region $AWS_REGION)
    
    if [ $? -eq 0 ]; then
        print_status "CloudFront invalidation created: ${INVALIDATION_ID}"
    else
        print_warning "Failed to create CloudFront invalidation, but configuration was uploaded"
    fi
else
    print_warning "CloudFront distribution ID not found, skipping invalidation"
fi

print_status "Frontend configuration update completed successfully!"

# Output the CloudFront URL for convenience
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ ! -z "$CLOUDFRONT_URL" ]; then
    echo ""
    print_status "Your application is available at: ${CLOUDFRONT_URL}"
    print_status "API endpoint: ${API_ENDPOINT}"
fi
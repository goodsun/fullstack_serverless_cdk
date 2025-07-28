# Deployment Scripts

This directory contains helper scripts for managing the fullstack serverless application deployment.

## Scripts

### update-frontend-config.sh

Updates the frontend configuration with the API endpoint after CDK deployment.

**Usage:**
```bash
./scripts/update-frontend-config.sh [dev|staging|prod]
```

This script:
1. Retrieves the API endpoint from the CloudFormation stack outputs
2. Updates the `frontend/js/api-config.js` file with the correct endpoint
3. Uploads only the updated config file to S3 (not the entire frontend)
4. Creates a CloudFront invalidation for the config file

This script is automatically called after CDK deployment when using `npm run deploy:[env]` commands.

### get-api-endpoint.sh

Retrieves the API endpoint from a deployed stack and optionally updates your local configuration.

**Usage:**
```bash
./scripts/get-api-endpoint.sh [dev|staging|prod]
```

This script is useful for:
- Local development when you need to connect to a deployed API
- Debugging deployment issues
- Checking stack outputs without using the AWS console

## Environment Variables

Both scripts use the following environment variables:
- `PROJECT_NAME`: Read from .env file or environment
- `AWS_REGION`: Read from .env file or defaults to 'ap-northeast-1'

## Required AWS Permissions

These scripts require AWS CLI to be configured with credentials that have permissions to:
- Read CloudFormation stack outputs
- Upload files to S3
- Create CloudFront invalidations
#!/bin/bash

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name TestMyApp-Dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text \
  --region ap-northeast-1)

echo "API Endpoint: $API_ENDPOINT"

# Test GET settings (should return 404 initially)
echo -e "\n1. Testing GET /settings/app_config (should be 404):"
curl -X GET "$API_ENDPOINT/settings/app_config"

# Test PUT settings
echo -e "\n\n2. Testing PUT /settings/app_config:"
curl -X PUT "$API_ENDPOINT/settings/app_config" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "web3": {
        "reownProjectId": "test-project-id",
        "enableWalletConnect": true,
        "supportedChains": [1, 137],
        "defaultChainId": 1
      },
      "features": {
        "requireAuthentication": false,
        "maintenanceMode": false
      }
    }
  }'

# Test GET settings again (should return the data)
echo -e "\n\n3. Testing GET /settings/app_config again:"
curl -X GET "$API_ENDPOINT/settings/app_config"

echo -e "\n"
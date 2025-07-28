#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { FullstackServerlessStack } from '../lib/fullstack-serverless-stack';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = new cdk.App();

// Get environment from context
const env = app.node.tryGetContext('env') || 'dev';

// Get project name from environment variable or use default
const projectName = process.env.PROJECT_NAME || 'fullstack-serverless';

// Convert project name to PascalCase for stack names
const stackPrefix = projectName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

// Helper function to get AWS region
const getRegion = () => process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

// Environment specific configuration
const envConfig = {
  dev: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: getRegion(),
    },
    stackName: `${stackPrefix}-Dev`,
  },
  staging: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: getRegion(),
    },
    stackName: `${stackPrefix}-Staging`,
  },
  prod: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: getRegion(),
    },
    stackName: `${stackPrefix}-Prod`,
  },
};

const config = envConfig[env as keyof typeof envConfig];

new FullstackServerlessStack(app, config.stackName, {
  env: config.env,
  description: `${projectName} - ${env.toUpperCase()} environment`,
  tags: {
    Environment: env,
    Project: projectName,
  },
  // Pass project name as context
  ...{ projectName },
});
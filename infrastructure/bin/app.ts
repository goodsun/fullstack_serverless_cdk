#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FullstackServerlessStack } from '../lib/fullstack-serverless-stack';

const app = new cdk.App();

// Get environment from context
const env = app.node.tryGetContext('env') || 'dev';

// Environment specific configuration
const envConfig = {
  dev: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    stackName: 'FullstackServerless-Dev',
  },
  staging: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    stackName: 'FullstackServerless-Staging',
  },
  prod: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    stackName: 'FullstackServerless-Prod',
  },
};

const config = envConfig[env as keyof typeof envConfig];

new FullstackServerlessStack(app, config.stackName, {
  env: config.env,
  description: `Fullstack Serverless Application - ${env.toUpperCase()} environment`,
  tags: {
    Environment: env,
    Project: 'FullstackServerless',
  },
});
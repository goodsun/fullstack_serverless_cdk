import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface FullstackServerlessStackProps extends cdk.StackProps {
  projectName: string;
}

export class FullstackServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FullstackServerlessStackProps) {
    super(scope, id, props);

    // Get configuration from props and context
    const env = this.node.tryGetContext('env') || 'dev';
    const projectName = props.projectName;

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: env === 'prod',
      },
      tableName: `${projectName}-items-${env}`,
    });

    // Lambda function for CRUD operations
    const crudLambda = new NodejsFunction(this, 'CrudHandler', {
      functionName: `${projectName}-crud-${env}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/crud.ts'),
      environment: {
        TABLE_NAME: table.tableName,
        REGION: this.region,
        ENV: env,
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      tracing: env === 'prod' ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      bundling: {
        minify: env === 'prod',
        sourceMap: env !== 'prod',
        target: 'es2022',
      },
    });

    // Grant permissions to Lambda
    table.grantReadWriteData(crudLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: `${projectName}-api-${env}`,
      description: 'API for CRUD operations',
      deployOptions: {
        stageName: env,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: env !== 'prod',
        metricsEnabled: true,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Lambda integration
    const integration = new apigateway.LambdaIntegration(crudLambda);

    // API endpoints
    const items = api.root.addResource('items');
    items.addMethod('GET', integration); // GET /items - List all items
    items.addMethod('POST', integration); // POST /items - Create new item

    const item = items.addResource('{id}');
    item.addMethod('GET', integration); // GET /items/{id} - Get specific item
    item.addMethod('PUT', integration); // PUT /items/{id} - Update item
    item.addMethod('DELETE', integration); // DELETE /items/{id} - Delete item

    // S3 Bucket for frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${projectName}-frontend-${env}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
      versioned: env === 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${projectName} ${env}`,
    });

    // Grant CloudFront access to S3 bucket
    websiteBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    // Deploy frontend files to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });
  }
}
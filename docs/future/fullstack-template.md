# フルスタックサーバーレステンプレート

## 概要
Lambda + DynamoDB + S3 + CloudFrontを統合したベストプラクティステンプレート

## アーキテクチャ

```
┌────────────────────┐
│     CloudFront     │  ← 静的コンテンツ配信
│        (CDN)       │  ← APIキャッシュ
└───────┬──────────┘
        │
    ┌───┴───┐
    │       │
┌───┴──┐ ┌─┴────────────┐
│  S3   │ │ API Gateway │
│Static │ │    + WAF     │
└───────┘ └─────┬───────┘
              │
         ┌────┴─────┐
         │  Lambda   │
         │Functions  │
         └────┬─────┘
              │
         ┌────┴─────┐
         │ DynamoDB  │
         └──────────┘
```

## プロジェクト構造

```
my-fullstack-app/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # CI/CDパイプライン
│       └── pr-check.yml        # PRチェック
├── infrastructure/             # CDKコード
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   └── fullstack-app-stack.ts
│   ├── cdk.json
│   └── package.json
├── backend/                    # Lambda関数
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── api.ts
│   │   │   └── authorizer.ts
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React/Vue/Next.js
│   ├── src/
│   ├── public/
│   └── package.json
├── scripts/                    # ビルド・デプロイスクリプト
│   ├── build.sh
│   └── deploy.sh
├── package.json               # ルートpackage.json
└── README.md
```

## CDKスタック実装

```typescript
// infrastructure/lib/fullstack-app-stack.ts
import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export interface FullstackAppStackProps extends StackProps {
  stage: string;
}

export class FullstackAppStack extends Stack {
  constructor(scope: Construct, id: string, props: FullstackAppStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // DynamoDBテーブル
    const table = new dynamodb.Table(this, 'AppTable', {
      tableName: `${id}-table-${stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: stage === 'prod',
      removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // GSI追加
    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });

    // S3バケット（静的コンテンツ用）
    const staticBucket = new s3.Bucket(this, 'StaticBucket', {
      bucketName: `${id}-static-${stage}`,
      removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: stage === 'prod',
    });

    // Lambda関数
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: `${id}-api-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'handlers/api.handler',
      environment: {
        TABLE_NAME: table.tableName,
        STAGE: stage,
        NODE_ENV: stage === 'prod' ? 'production' : 'development',
      },
      memorySize: 512,
      timeout: Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambdaに権限付与
    table.grantReadWriteData(apiHandler);
    staticBucket.grantRead(apiHandler);

    // WAFルール
    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'WebAcl',
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${id}-api-${stage}`,
      deployOptions: {
        stageName: stage,
        tracingEnabled: true,
        dataTraceEnabled: stage !== 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // APIエンドポイント
    const integration = new apigateway.LambdaIntegration(apiHandler);
    const apiResource = api.root.addResource('api');
    apiResource.addMethod('GET', integration);
    apiResource.addMethod('POST', integration);
    apiResource.addMethod('PUT', integration);
    apiResource.addMethod('DELETE', integration);

    // WAFをAPI Gatewayにアタッチ
    new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn,
    });

    // CloudFront OAI
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    staticBucket.grantRead(oai);

    // CloudFrontディストリビューション
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(staticBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    // 出力
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.domainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'StaticBucketName', {
      value: staticBucket.bucketName,
      description: 'Static content bucket name',
    });
  }
}
```

## CI/CDパイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main
      - develop
  workflow_dispatch:
    inputs:
      stage:
        description: 'Deployment stage'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build backend
        working-directory: ./backend
        run: |
          npm ci
          npm run build
      
      - name: Build frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
      
      - name: Upload backend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-dist
          path: backend/dist
      
      - name: Upload frontend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.event.inputs.stage || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Download backend artifacts
        uses: actions/download-artifact@v4
        with:
          name: backend-dist
          path: backend/dist
      
      - name: Download frontend artifacts
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ vars.AWS_REGION }}
      
      - name: Install CDK dependencies
        working-directory: ./infrastructure
        run: npm ci
      
      - name: Deploy infrastructure
        working-directory: ./infrastructure
        env:
          STAGE: ${{ github.event.inputs.stage || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
        run: |
          npx cdk deploy \
            --require-approval never \
            --context stage=$STAGE \
            --outputs-file outputs.json
      
      - name: Deploy frontend to S3
        env:
          STAGE: ${{ github.event.inputs.stage || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
        run: |
          BUCKET_NAME=$(cat infrastructure/outputs.json | jq -r '."FullstackAppStack-'$STAGE'".StaticBucketName')
          aws s3 sync frontend/dist s3://$BUCKET_NAME --delete
      
      - name: Invalidate CloudFront
        env:
          STAGE: ${{ github.event.inputs.stage || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
        run: |
          DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Comment=='FullstackAppStack-$STAGE'].Id" \
            --output text)
          aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*"
```

## ルートpackage.json

```json
{
  "name": "fullstack-serverless-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm ci && npm run install:backend && npm run install:frontend && npm run install:infra",
    "install:backend": "cd backend && npm ci",
    "install:frontend": "cd frontend && npm ci",
    "install:infra": "cd infrastructure && npm ci",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:ci": "npm run test -- --ci --coverage",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd backend && npm run lint",
    "lint:frontend": "cd frontend && npm run lint",
    "typecheck": "npm run typecheck:backend && npm run typecheck:frontend",
    "typecheck:backend": "cd backend && npm run typecheck",
    "typecheck:frontend": "cd frontend && npm run typecheck",
    "deploy:dev": "cd infrastructure && STAGE=dev npm run deploy",
    "deploy:staging": "cd infrastructure && STAGE=staging npm run deploy",
    "deploy:prod": "cd infrastructure && STAGE=prod npm run deploy",
    "destroy:dev": "cd infrastructure && STAGE=dev npm run destroy"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## ベストプラクティス

### 1. インフラとアプリケーションの統合デプロイ
- CDKでインフラをデプロイ
- ビルド済みアーティファクトをS3に同期
- CloudFrontキャッシュ無効化

### 2. 環境分離
- ステージ名をリソース名に含める
- GitHub Environmentsで承認フロー
- 環境変数とSecretsの分離

### 3. セキュリティ
- WAFによるDDoS対策
- S3バケットのブロックパブリックアクセス
- CloudFront OAIによるアクセス制御

### 4. パフォーマンス
- CloudFrontによるグローバル配信
- LambdaのX-Rayトレーシング
- DynamoDBのPay-Per-Request

### 5. コスト最適化
- 開発環境ではリソースを自動削除
- CloudFrontのPriceClass最適化
- Lambdaのメモリサイズ調整

### 6. モニタリング
- CloudWatch Logsへのログ出力
- メトリクスの有効化
- X-Rayによる分散トレーシング

## 使い方

```bash
# プロジェクト初期化
npx create-fullstack-serverless my-app
cd my-app

# 依存関係インストール
npm run install:all

# ローカル開発
npm run dev

# デプロイ
npm run deploy:dev
```
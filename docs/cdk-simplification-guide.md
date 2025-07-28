# CDK簡素化ガイド - serverless-cdkの改善方針

## 問題点：複雑すぎるCDK基盤

### 典型的な過度な複雑化の例
- 多層の抽象化レイヤー
- 過剰なConstruct分割
- 環境ごとの複雑な分岐処理
- 不必要なカスタムリソース
- 過度な設定の外部化

## 解決策：シンプルなベストプラクティス

### 1. 単一責任・単一スタック原則
```typescript
// ❌ 悪い例：過度に分割されたスタック
export class NetworkStack extends Stack { ... }
export class SecurityStack extends Stack { ... }
export class ComputeStack extends Stack { ... }
export class DatabaseStack extends Stack { ... }

// ✅ 良い例：1つのサービス = 1つのスタック
export class MyServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    // すべてのリソースを1つのスタックで管理
    const table = new Table(this, 'Table', { ... });
    const handler = new Function(this, 'Handler', { ... });
    const api = new RestApi(this, 'Api', { ... });
  }
}
```

### 2. フラットな構造を保つ
```
my-service/
├── bin/
│   └── app.ts              # シンプルなエントリーポイント
├── lib/
│   └── my-service-stack.ts # 全リソース定義（1ファイル）
├── lambda/
│   └── index.ts            # Lambda関数コード
├── cdk.json
└── package.json
```

### 3. 環境差分はシンプルに
```typescript
// ❌ 悪い例：複雑な環境分岐
if (props.env === 'dev') {
  // 開発環境用の複雑な設定
} else if (props.env === 'staging') {
  // ステージング用の設定
} else {
  // 本番用の設定
}

// ✅ 良い例：環境変数とタグで管理
const isProd = process.env.STAGE === 'prod';

new MyServiceStack(app, `MyService-${stage}`, {
  env: { account, region },
  tags: {
    Environment: stage,
    Service: 'my-service'
  }
});
```

### 4. L2 Constructを最大限活用
```typescript
// ❌ 悪い例：L1 Constructで複雑な定義
const cfnFunction = new CfnFunction(this, 'Function', {
  functionName: 'my-function',
  runtime: 'nodejs20.x',
  // 多くの手動設定...
});

// ✅ 良い例：L2 Constructでシンプルに
const handler = new Function(this, 'Handler', {
  runtime: Runtime.NODEJS_20_X,
  code: Code.fromAsset('lambda'),
  handler: 'index.handler'
});
```

### 5. 実装例：完全なシンプルスタック
```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';

export class MyServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
    const table = new Table(this, 'DataTable', {
      tableName: `${id}-table`,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY // 開発用
    });

    // Lambda 関数
    const handler = new Function(this, 'ApiHandler', {
      functionName: `${id}-handler`,
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        TABLE_NAME: table.tableName,
        NODE_ENV: process.env.STAGE || 'dev'
      }
    });

    // DynamoDBへのアクセス権限
    table.grantReadWriteData(handler);

    // API Gateway
    const api = new RestApi(this, 'ServiceApi', {
      restApiName: `${id}-api`,
      deployOptions: {
        stageName: process.env.STAGE || 'dev'
      }
    });

    // APIエンドポイント定義
    const integration = new LambdaIntegration(handler);
    api.root.addMethod('GET', integration);
    api.root.addMethod('POST', integration);
    
    // 出力
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL'
    });
  }
}
```

### 6. デプロイスクリプトもシンプルに
```json
// package.json
{
  "scripts": {
    "deploy": "cdk deploy",
    "deploy:dev": "STAGE=dev cdk deploy",
    "deploy:prod": "STAGE=prod cdk deploy --require-approval never",
    "destroy": "cdk destroy"
  }
}
```

## 移行戦略

### Phase 1: 現状分析（完了）
- 複雑すぎる抽象化の特定
- 不要なコンポーネントの洗い出し

### Phase 2: 新構成への移行
1. 新しいシンプルなスタック作成
2. 既存リソースを1つずつ移行
3. 不要な抽象化レイヤーを削除
4. テストとデプロイ検証

### Phase 3: テンプレート化
1. 汎用的な部分を抽出
2. CLIツールでのプロジェクト生成対応
3. ドキュメント整備

## まとめ
- **KISS原則**（Keep It Simple, Stupid）を徹底
- 将来の拡張性より現在のシンプルさを優先
- 必要になったら複雑化すればよい
- スモールスタートに最適な構成を維持
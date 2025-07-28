# shareNOTEから得た学びの活用

## 1. スモールスタート原則の実装への反映

### テンプレート設計思想
- **MVP優先のディレクトリ構造**: 最小限から始められる
- **段階的拡張を前提とした設計**: 後から機能追加しやすい構造
- **50%で動き始める**: 完璧な設計より動くものを優先

### 実装例
```
serverless-cdk-starter/
├── src/
│   └── handler.ts      # 最初はこれだけでOK
├── lib/
│   └── stack.ts        # 最小限のCDK定義
└── package.json        # 必要最小限の依存関係
```

## 2. デプロイプロセスの標準化

### 学んだこと
- デプロイスクリプトの重要性（実装は速いがデプロイで詰まる）
- 環境変数の統一管理
- ワンコマンドデプロイの価値

### テンプレートに組み込むべき機能
```json
{
  "scripts": {
    "deploy:dev": "npm run build && cdk deploy --context env=dev",
    "deploy:prod": "npm run build && cdk deploy --context env=prod --require-approval never",
    "destroy:dev": "cdk destroy --context env=dev",
    "diff": "cdk diff",
    "synth": "cdk synth"
  }
}
```

### 環境設定ファイル
```
config/
├── dev.json
├── prod.json
└── example.json  # 設定例（.gitignore対象外）
```

## 3. ドキュメント駆動開発の仕組み

### 必須ドキュメントテンプレート
```
docs/
├── API.md                    # API仕様（自動生成可能）
├── DEPLOYMENT.md             # デプロイ手順
├── ARCHITECTURE.md           # アーキテクチャ説明
└── project-retrospective.md  # 振り返りテンプレート
```

### README.mdの標準構成
1. **Quick Start** - 30秒で動かす
2. **Architecture** - 何をどう実現しているか
3. **Development** - 開発の始め方
4. **Deployment** - 本番環境への展開
5. **Troubleshooting** - よくある問題と解決法

## 4. CI/CDパイプラインの標準装備

### GitHub Actions設定
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy to AWS
        run: npm run deploy:${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
```

## 5. 技術スタックの標準化

### 実証済みの組み合わせ
- **Runtime**: Node.js 20.x
- **Language**: TypeScript
- **IaC**: AWS CDK v2
- **Test**: Jest
- **Lint**: ESLint + Prettier
- **Logger**: 構造化ログ（JSON形式）

### AWSサービス構成
- **Lambda**: 処理ロジック
- **API Gateway**: RESTful API
- **DynamoDB**: NoSQLデータストア
- **S3**: ファイルストレージ/静的ホスティング

### S3の標準的な用途
```typescript
// lib/s3-stack.ts
export class S3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ファイルアップロード用バケット
    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      lifecycleRules: [{
        id: 'delete-old-files',
        expiration: cdk.Duration.days(30),
      }],
    });

    // 静的ホスティング用バケット（オプション）
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // Lambda関数にS3アクセス権限を付与
    uploadBucket.grantReadWrite(lambdaFunction);
  }
}
```

### TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 6. エラーハンドリングとログ

### 標準エラーレスポンス
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId: string;
  };
}
```

### 構造化ログの実装
```typescript
const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

## 7. テスト戦略の組み込み

### 最小限のテスト構成
- ユニットテスト: handler関数の基本動作
- 統合テスト: API Gateway + Lambda の連携
- デプロイ検証: ヘルスチェックエンドポイント

## 8. 環境変数の一元管理戦略

### 問題意識
- ローカル開発の.envとGitHub Actionsのsecretsが不一致
- 新しい環境変数追加時の更新漏れ
- どの環境変数が必要かの可視化不足

### 解決策1: 環境変数定義ファイル
```yaml
# .env.schema.yml
environment_variables:
  - name: AWS_REGION
    required: true
    default: "ap-northeast-1"
    description: "AWS region for deployment"
    
  - name: DATABASE_URL
    required: true
    secret: true
    description: "DynamoDB endpoint URL"
    
  - name: LOG_LEVEL
    required: false
    default: "info"
    description: "Logging level (debug, info, warn, error)"
```

### 解決策2: 環境変数チェックスクリプト
```bash
#!/bin/bash
# scripts/check-env.sh

# .env.exampleから必要な環境変数を抽出
required_vars=$(grep -v '^#' .env.example | grep -v '^$' | cut -d'=' -f1)

# ローカル環境チェック
echo "Checking local .env..."
for var in $required_vars; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Found: $var"
  fi
done

# GitHub Secretsチェック（gh CLIを使用）
echo -e "\nChecking GitHub Secrets..."
gh secret list --json name -q '.[].name' | while read secret; do
  if echo "$required_vars" | grep -q "^$secret$"; then
    echo "✅ Found in GitHub: $secret"
  fi
done
```

### 解決策3: 自動同期の仕組み
```yaml
# .github/workflows/sync-env.yml
name: Environment Variables Check
on:
  pull_request:
    paths:
      - '.env.example'
      - '.env.schema.yml'

jobs:
  check-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check environment variables consistency
        run: |
          # .env.exampleの変数がGitHub Secretsに存在するかチェック
          ./scripts/check-env.sh
```

### 解決策4: ドキュメント自動生成
```typescript
// scripts/generate-env-docs.ts
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';

const schema = parse(readFileSync('.env.schema.yml', 'utf8'));
let markdown = '# Environment Variables\n\n';

markdown += '| Variable | Required | Default | Description |\n';
markdown += '|----------|----------|---------|-------------|\n';

schema.environment_variables.forEach(env => {
  markdown += `| ${env.name} | ${env.required ? '✅' : '❌'} | ${env.default || '-'} | ${env.description} |\n`;
});

writeFileSync('docs/ENVIRONMENT.md', markdown);
```

### 実装のベストプラクティス
1. **.env.example** を常に最新に保つ（全環境変数を記載）
2. **GitHub Actions設定時のチェックリスト** を用意
3. **環境変数追加時のPRテンプレート** に確認項目を含める
4. **定期的な監査スクリプト** で不整合を検出

### PRテンプレート例
```markdown
## 環境変数の追加・変更がある場合

- [ ] .env.example を更新した
- [ ] .env.schema.yml を更新した
- [ ] GitHub Secrets に追加が必要な場合は、管理者に連絡した
- [ ] ドキュメント（docs/ENVIRONMENT.md）を更新した
- [ ] デプロイ手順書に変更内容を記載した
```

## まとめ
これらの学びを組み込むことで、serverless-cdkは単なるボイラープレートではなく、実践的な知見が詰まった「賢いスターター」になる。特に環境変数の一元管理は、複数プロジェクトを効率的に運用する上で欠かせない仕組みとなる。
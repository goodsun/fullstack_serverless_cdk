# ローカル開発とCI/CDの完全同期化ガイド

## 🚨 よくある失敗パターン

### 問題1: ローカルとCI/CDのビルドプロセス不一致
```bash
# ローカルでは
npm run build  # TypeScriptビルドが走る
npm run deploy # ビルド済みファイルをデプロイ

# GitHub Actionsでは
- run: npm run deploy  # ビルドなしでデプロイ！
```

### 問題2: 同じデプロイ先での混在
- ローカルから手動デプロイしたコード
- CI/CDから自動デプロイされたコード
- どちらが最新か不明で障害時に混乱

### 問題3: 環境変数の不一致
```bash
# ローカル: .envファイル使用
API_KEY=local_key_12345

# GitHub Actions: Secrets使用
API_KEY=${{ secrets.API_KEY }}  # 値が違う！
```

## ✅ 解決策: 完全同期化の鉄則

### 1. ビルドプロセスの統一

#### package.jsonでの定義
```json
{
  "scripts": {
    "build": "tsc && cp -r src/templates dist/",
    "test": "jest",
    "lint": "eslint . --ext .ts",
    "deploy:dev": "npm run build && STAGE=dev cdk deploy",
    "deploy:prod": "npm run build && STAGE=prod cdk deploy --require-approval never",
    "deploy:ci": "npm run lint && npm run test && npm run deploy:$STAGE"
  }
}
```

#### GitHub Actionsでの実行
```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Deploy to Dev
        if: github.ref == 'refs/heads/develop'
        env:
          STAGE: dev
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npm run deploy:ci  # ローカルと同じコマンド！
        
      - name: Deploy to Prod
        if: github.ref == 'refs/heads/main'
        env:
          STAGE: prod
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npm run deploy:ci
```

### 2. 環境分離の徹底

#### CDKスタック名での分離
```typescript
// bin/app.ts
const stage = process.env.STAGE || 'dev';
const stackName = `MyService-${stage}`;

new MyServiceStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Stage: stage,
    ManagedBy: process.env.CI ? 'github-actions' : 'local'
  }
});
```

#### デプロイ先のAWSアカウント分離
```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-dev:
    environment: development  # GitHub環境設定
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.DEV_AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.DEV_AWS_SECRET_ACCESS_KEY }}
      
  deploy-prod:
    environment: production
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
```

### 3. ローカル開発環境の標準化

#### .env.exampleの提供
```bash
# .env.example
STAGE=dev
AWS_PROFILE=my-dev-profile
AWS_REGION=us-east-1
```

#### ローカル専用ステージ
```typescript
// 個人開発用ステージを用意
const stage = process.env.STAGE || `dev-${process.env.USER}`;
// 例: dev-tanaka, dev-suzuki
```

### 4. ビルド成果物の管理

#### .gitignoreの徹底
```gitignore
# ビルド成果物は絶対にコミットしない
dist/
*.js
!jest.config.js
cdk.out/
.env
.env.local
```

#### ビルド済みファイルの明示的削除
```json
{
  "scripts": {
    "clean": "rm -rf dist cdk.out",
    "build": "npm run clean && tsc",
    "deploy:dev": "npm run build && STAGE=dev cdk deploy"
  }
}
```

### 5. CI/CDとローカルの完全一致チェックリスト

#### ローカルでのテスト手順
```bash
# 1. 環境変数設定
export STAGE=dev
export CI=true  # CI環境をシミュレート

# 2. CIと同じコマンドを実行
npm ci  # npm installではなく
npm run deploy:ci

# 3. 結果確認
aws cloudformation describe-stacks --stack-name MyService-dev
```

#### 自動検証スクリプト
```bash
#!/bin/bash
# scripts/verify-ci-local-sync.sh

echo "Checking local vs CI/CD sync..."

# package.jsonのスクリプトとGitHub Actionsのコマンドを比較
diff <(grep -E "npm run" .github/workflows/*.yml) \
     <(grep -E '".*":' package.json | grep scripts -A 20)

# 環境変数の一致を確認
echo "Required env vars:"
grep -E "process\.env\.[A-Z_]+" lib/*.ts src/*.ts
```

### 6. ベストプラクティスまとめ

1. **同じコマンドを使う**: ローカルもCI/CDも`npm run deploy:ci`
2. **環境を分離する**: dev/staging/prodをAWSアカウントレベルで分ける
3. **ビルドを必須にする**: デプロイコマンドにビルドを含める
4. **タグで管理する**: 誰がいつデプロイしたか追跡可能に
5. **ローカルでCIを再現**: CI=trueでローカルテスト

## トラブルシューティング

### Q: ローカルでは動くが、CI/CDで失敗する
```bash
# CI環境を完全に再現
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  node:20 \
  bash -c "npm ci && npm run deploy:ci"
```

### Q: どちらからデプロイされたか不明
```bash
# CloudFormationスタックのタグを確認
aws cloudformation describe-stacks \
  --stack-name MyService-dev \
  --query 'Stacks[0].Tags[?Key==`ManagedBy`].Value' \
  --output text
```
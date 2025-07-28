# 選択的デプロイ戦略

## 現状: 全スタック一律更新の背景

### なぜ全スタック更新を選んだか
- **失敗から学んだ教訓**: 部分更新での依存関係の見落とし
- **確実性優先**: 「動くことが確認できている状態」の再現
- **シンプルさ**: 考えることが少ない、ミスが起きにくい

### 現在の方式のメリット
1. **予測可能性**: 全て更新するので、部分的な不整合が起きない
2. **簡潔なCI/CD**: 複雑な条件分岐が不要
3. **テストの信頼性**: 全体テストの結果がそのまま本番に反映
4. **初心者にも安全**: 依存関係を深く理解していなくても使える

### 現在の方式のデメリット
1. **デプロイ時間**: 変更が小さくても全体の更新時間がかかる
2. **コスト**: 不要なリソースの再作成によるAWS料金
3. **ダウンタイム**: Lambda更新時の一時的な遅延
4. **開発効率**: 小さな修正でも待ち時間が長い

## 将来: 選択的デプロイへの段階的移行

### Phase 1: 安全な選択的デプロイの基礎作り

#### 変更検知の仕組み
```bash
# scripts/detect-changes.sh
#!/bin/bash

# 前回のデプロイからの変更を検知
LAST_DEPLOY_COMMIT=$(aws ssm get-parameter --name "/app/last-deploy-commit" --query 'Parameter.Value' --output text)
CHANGED_FILES=$(git diff --name-only $LAST_DEPLOY_COMMIT HEAD)

# 変更タイプを分類
INFRA_CHANGED=false
LAMBDA_CHANGED=false
CONFIG_CHANGED=false

echo "$CHANGED_FILES" | grep -E "(lib/|bin/)" && INFRA_CHANGED=true
echo "$CHANGED_FILES" | grep -E "src/" && LAMBDA_CHANGED=true
echo "$CHANGED_FILES" | grep -E "(config/|.env)" && CONFIG_CHANGED=true
```

#### 依存関係マップ
```yaml
# .deploy/dependencies.yml
components:
  lambda:
    depends_on: []
    triggers_update: ["api_gateway"]
    
  dynamodb:
    depends_on: []
    triggers_update: ["lambda"]
    
  api_gateway:
    depends_on: ["lambda"]
    triggers_update: []
```

### Phase 2: Lambda関数の個別更新

#### 実装例
```typescript
// scripts/deploy-lambda.ts
import { Lambda } from 'aws-sdk';

async function updateLambdaCode(functionName: string) {
  const lambda = new Lambda();
  
  // コードのみ更新（設定は変更しない）
  await lambda.updateFunctionCode({
    FunctionName: functionName,
    ZipFile: await buildLambdaPackage()
  }).promise();
  
  // 更新完了を待つ
  await lambda.waitFor('functionUpdated', {
    FunctionName: functionName
  }).promise();
}
```

#### package.jsonスクリプト
```json
{
  "scripts": {
    "deploy:lambda": "ts-node scripts/deploy-lambda.ts",
    "deploy:full": "cdk deploy --all",
    "deploy:smart": "bash scripts/smart-deploy.sh"
  }
}
```

### Phase 3: インテリジェントデプロイ

#### smart-deploy.sh
```bash
#!/bin/bash

# 変更を検知
source scripts/detect-changes.sh

# デプロイ戦略を決定
if [ "$INFRA_CHANGED" = true ]; then
  echo "🏗️  Infrastructure changed - Full deployment required"
  npm run deploy:full
elif [ "$LAMBDA_CHANGED" = true ] && [ "$CONFIG_CHANGED" = false ]; then
  echo "⚡ Lambda code only - Quick deployment"
  npm run deploy:lambda
elif [ "$CONFIG_CHANGED" = true ]; then
  echo "⚙️  Configuration changed - Updating stack"
  npm run deploy:full
else
  echo "✅ No changes detected"
fi

# 最後のデプロイコミットを記録
git rev-parse HEAD | aws ssm put-parameter --name "/app/last-deploy-commit" --value file:///dev/stdin --overwrite
```

### Phase 4: より高度な最適化

#### 並列デプロイ
```typescript
// 独立したLambda関数を並列更新
const independentFunctions = ['function1', 'function2', 'function3'];
await Promise.all(
  independentFunctions.map(fn => updateLambdaCode(fn))
);
```

#### キャッシュ活用
```yaml
# .github/workflows/deploy.yml
- name: Cache CDK assets
  uses: actions/cache@v3
  with:
    path: cdk.out
    key: ${{ runner.os }}-cdk-${{ hashFiles('**/package-lock.json') }}
```

## 実装ロードマップ

### Step 1: 基礎固め（現在）
- ✅ 全スタック更新で安定運用
- ✅ デプロイプロセスの標準化
- ✅ CI/CDパイプラインの確立

### Step 2: 計測と分析（次のフェーズ）
- デプロイ時間の詳細計測
- 各コンポーネントの更新頻度分析
- ボトルネックの特定

### Step 3: 段階的導入
1. **開発環境で選択的デプロイ**を試験
2. **Lambdaコードのみ更新**から開始
3. **依存関係の自動検証**を追加
4. **本番環境への段階的適用**

### Step 4: 完全自動化
- AIによる変更影響分析
- 自動ロールバック機能
- デプロイ戦略の自動最適化

## ベストプラクティス

### DO
- ✅ 変更の影響範囲を明確に文書化
- ✅ 依存関係を可視化
- ✅ ロールバック手順を用意
- ✅ 段階的に移行

### DON'T
- ❌ いきなり本番で試す
- ❌ 依存関係を推測で判断
- ❌ テストなしで部分更新
- ❌ 複雑すぎる条件分岐

## 環境別デプロイ戦略: ベストオブボスワールズ

### 基本方針
- **develop環境**: 速度優先の差分デプロイ 🚀
- **staging環境**: 本番同等の完全デプロイ（オプション）
- **production環境**: 確実性優先の完全デプロイ 🛡️

### 実装例

#### 環境判定ロジック
```bash
#!/bin/bash
# scripts/deploy.sh

ENVIRONMENT=${1:-dev}

case $ENVIRONMENT in
  "dev"|"develop")
    echo "🚀 Development deployment - Using smart deploy"
    ./scripts/smart-deploy.sh
    ;;
  "staging")
    echo "🧪 Staging deployment - Full stack update"
    npm run deploy:full -- --context env=staging
    ;;
  "prod"|"production")
    echo "🛡️  Production deployment - Full stack update with approval"
    npm run deploy:full -- --context env=prod --require-approval broadening
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac
```

#### package.jsonの統合
```json
{
  "scripts": {
    "deploy": "bash scripts/deploy.sh",
    "deploy:dev": "bash scripts/deploy.sh dev",
    "deploy:prod": "bash scripts/deploy.sh prod",
    "deploy:dev:full": "cdk deploy --context env=dev --all",
    "deploy:dev:lambda": "ts-node scripts/deploy-lambda.ts --env dev"
  }
}
```

#### GitHub Actions環境別設定
```yaml
name: Deploy
on:
  push:
    branches:
      - develop
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure deployment strategy
        id: strategy
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
            echo "strategy=smart" >> $GITHUB_OUTPUT
            echo "environment=dev" >> $GITHUB_OUTPUT
          else
            echo "strategy=full" >> $GITHUB_OUTPUT
            echo "environment=prod" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy
        run: |
          if [[ "${{ steps.strategy.outputs.strategy }}" == "smart" ]]; then
            npm run deploy:dev
          else
            npm run deploy:prod
          fi
```

### メリット

#### 開発環境での差分デプロイ
- ✅ **高速フィードバック**: 変更から確認まで1-2分
- ✅ **開発効率向上**: 待ち時間のストレス削減
- ✅ **実験的変更が容易**: すぐに試せる

#### 本番環境での完全デプロイ
- ✅ **確実性**: テスト済みの完全な状態を再現
- ✅ **監査性**: 全リソースの状態が明確
- ✅ **ロールバック容易**: 前の完全な状態に戻せる

### 追加の最適化案

#### 1. ハイブリッドアプローチ
```typescript
// develop環境でも、週1回は完全デプロイ
if (isDevelop && Date.now() - lastFullDeploy > 7 * 24 * 60 * 60 * 1000) {
  console.log("📅 Weekly full deployment for develop environment");
  await fullDeploy();
}
```

#### 2. 変更サイズによる自動判定
```bash
# 大きな変更の場合は開発環境でも完全デプロイ
CHANGED_FILES_COUNT=$(git diff --name-only HEAD~1 | wc -l)
if [ $CHANGED_FILES_COUNT -gt 10 ]; then
  echo "⚠️  Large changeset detected - forcing full deployment"
  FORCE_FULL_DEPLOY=true
fi
```

#### 3. エラー時の自動フォールバック
```typescript
try {
  await smartDeploy();
} catch (error) {
  console.error("❌ Smart deploy failed, falling back to full deploy");
  await fullDeploy();
}
```

### 運用ガイドライン

#### 開発チーム向け
1. **通常の開発**: `npm run deploy:dev` で高速デプロイ
2. **インフラ変更時**: 自動的に完全デプロイに切り替わる
3. **トラブル時**: `npm run deploy:dev:full` で強制完全デプロイ

#### 本番リリース時
1. **必ず完全デプロイ**: 部分更新は選択不可
2. **承認プロセス**: CloudFormationの変更確認
3. **ロールバック準備**: 前バージョンの記録

## まとめ
全スタック更新は「確実だが遅い」、選択的デプロイは「速いがリスクあり」。
環境別に戦略を分けることで、開発効率と本番の確実性を両立できる。

- **開発**: イテレーション速度を最大化
- **本番**: 信頼性とトレーサビリティを最優先

この「環境別デプロイ戦略」により、それぞれの環境の目的に最適化されたデプロイが実現できる。
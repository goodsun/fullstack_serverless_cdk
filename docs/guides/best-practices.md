# ベストプラクティス

fullstack-serverless-cdkプロジェクトで推奨される実践的な開発手法をまとめています。

## 1. スモールスタート原則

### 基本思想
- **MVP優先**: 最小限の機能から始める
- **段階的拡張**: 後から機能追加しやすい構造
- **50%で動き始める**: 完璧な設計より動くものを優先

### 実装例
```
プロジェクト/
├── backend/src/
│   └── handlers/
│       └── crud.ts      # 最初はCRUDだけでOK
├── infrastructure/lib/
│   └── stack.ts         # 最小限のCDK定義
└── package.json         # 必要最小限の依存関係
```

## 2. デプロイプロセスの標準化

### 重要なポイント
- ワンコマンドデプロイの実現
- 環境別設定の明確な分離
- デプロイエラーの早期発見

### package.jsonの標準スクリプト
```json
{
  "scripts": {
    "deploy:dev": "cdk deploy --context env=dev",
    "deploy:staging": "cdk deploy --context env=staging",
    "deploy:prod": "cdk deploy --context env=prod",
    "destroy": "cdk destroy",
    "diff": "cdk diff",
    "synth": "cdk synth"
  }
}
```

## 3. エラーハンドリングとログ

### 標準エラーレスポンス形式
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
const log = (level: string, message: string, meta?: any) => {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  }));
};
```

## 4. TypeScript設定の標準

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

## 5. テスト戦略

### 最小限のテスト構成
1. **ユニットテスト**: Lambda関数の基本動作
2. **統合テスト**: API Gateway + Lambda の連携
3. **デプロイ検証**: ヘルスチェックエンドポイント

### テストの追加タイミング
- 新機能追加時
- バグ修正時（リグレッション防止）
- リファクタリング前

## 6. セキュリティのベストプラクティス

### IAMポリシーの最小権限原則
```typescript
// 必要な権限のみを付与
table.grantReadWriteData(lambdaFunction); // 特定のテーブルのみ
```

### 環境変数でのシークレット管理
- AWS Systems Manager Parameter Store の活用
- 環境別の値の分離
- ローカル開発用の .env ファイル（gitignore必須）

## 7. CI/CDパイプラインの考え方

### 基本フロー
1. コードのビルド・テスト
2. CDKの合成（synth）
3. 環境別デプロイ
4. デプロイ後の検証

### ブランチ戦略
- `production` → 本番環境（prod）
- `staging` → ステージング環境
- `develop` → 開発環境（dev）
- `feature/*` → 機能開発（PRベース）

## 8. ドキュメント駆動開発

### 必須ドキュメント
- **README.md**: プロジェクト概要とクイックスタート
- **API仕様**: エンドポイントとレスポンス形式
- **デプロイ手順**: 環境別の詳細な手順
- **トラブルシューティング**: よくある問題と解決法

## 9. コスト最適化

### Lambda関数
- 適切なメモリサイズの設定（パフォーマンステスト実施）
- タイムアウト値の最適化
- 不要な関数の定期的な削除

### DynamoDB
- オンデマンド課金の活用（初期は PAY_PER_REQUEST）
- 本番環境でのキャパシティ設計

### S3
- ライフサイクルポリシーの設定
- 不要なバージョンの削除

## 10. 開発効率化のTips

### ローカル開発
- AWS SAM CLI を使用したローカルテスト
- DynamoDB Local の活用
- 環境変数の自動読み込み設定

### デバッグ
- CloudWatch Logs Insights の活用
- X-Ray トレーシングの有効化
- 構造化ログによる検索性向上

## 11. 環境変数によるプロジェクト管理

### プロジェクト名の環境変数管理
複数のプロジェクトで同じテンプレートを使用する場合の必須設定：

```bash
# .env.example
PROJECT_NAME=my-awesome-app
```

### 実装方法
```typescript
// CDKでの環境変数読み込み
import * as dotenv from 'dotenv';
dotenv.config();

const projectName = process.env.PROJECT_NAME || 'default-app';
```

### メリット
- 同一テンプレートで複数プロジェクトを管理可能
- リソース名の衝突を防止
- CI/CDパイプラインでの自動化が容易
- チーム開発での設定共有が簡単

### 命名規則の統一
```
スタック名: {ProjectName}-{Env}
リソース名: {project-name}-{resource}-{env}
```

### GitHub Actionsでの設定
```yaml
env:
  PROJECT_NAME: ${{ secrets.PROJECT_NAME }}
```

## まとめ

これらのベストプラクティスは、実際のプロジェクト運用から得られた知見です。
すべてを一度に実装する必要はありません。プロジェクトの成長に合わせて段階的に適用していくことが重要です。
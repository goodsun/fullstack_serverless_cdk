# fullstack-serverless-cdkセットアップガイド

## 📋 プロジェクト概要

フルスタックサーバーレスアプリケーションを素早く構築するためのCDKテンプレート。

### 背景と価値提案
- サーバーレスアプリケーション開発の「またゼロからCDK書くのか...」問題を解決
- 実証済みのAWSアーキテクチャを即座に利用可能
- 0からAPI稼働までの時間を大幅に短縮（目標: 30分以内）

### 特徴
- Lambda + API Gateway + DynamoDB + S3 + CloudFrontの統合構成
- 環境別デプロイ対応（dev/staging/prod）
- シンプルなCRUD API実装済み
- プレーンなHTML/CSS/JSのフロントエンド（フレームワーク非依存）
- CORS対応済み

## 🚀 クイックスタート

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/fullstack-serverless-cdk.git
cd fullstack-serverless-cdk
```

### 2. 初期セットアップ
```bash
# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp .env.example .env

# .envファイルを編集してプロジェクト名を設定
# PROJECT_NAME=my-awesome-app
```

### 3. AWS認証情報の設定
```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_PROFILE=your-profile-name
```

## 📦 プロジェクト構造

```
fullstack-serverless-cdk/
├── infrastructure/             # CDKコード
│   ├── bin/
│   │   └── app.ts             # CDKアプリエントリポイント
│   └── lib/
│       └── fullstack-serverless-stack.ts  # メインスタック定義
├── backend/                    # Lambda関数
│   └── src/
│       └── handlers/          # APIハンドラー
│           └── crud.ts        # CRUD操作ハンドラー
├── frontend/                   # フロントエンド（プレーンHTML/CSS/JS）
│   ├── assets/                # 画像等のアセット
│   ├── css/                   # スタイルシート
│   │   └── style.css
│   ├── js/                    # JavaScriptファイル
│   │   ├── api.js            # APIクライアント
│   │   ├── app.js            # メインアプリケーション
│   │   └── config.js         # 設定ファイル
│   ├── index.html             # メインページ
│   └── error.html             # エラーページ
├── docs/                       # ドキュメント
│   └── *.md                   # 各種ガイドドキュメント
├── cdk.json                   # CDK設定
├── package.json               # ルートpackage.json
├── tsconfig.json              # TypeScript設定
└── README.md
```

## 🔧 開発コマンド

### ビルドとテスト
```bash
# TypeScriptのビルド
npm run build

# ビルドの監視モード
npm run watch

# テスト（※テストコードは今後実装予定）
npm run test
```

### CDKコマンド
```bash
# CDK合成（CloudFormationテンプレート生成）
npm run synth

# 変更内容の確認
npm run diff

# デプロイ
npm run deploy:dev      # 開発環境
npm run deploy:staging  # ステージング環境
npm run deploy:prod     # 本番環境

# スタックの削除
npm run destroy:dev     # 開発環境
npm run destroy:staging # ステージング環境
npm run destroy:prod    # 本番環境
```

## 🌐 エンドポイントとリソース名

### リソースの命名規則
すべてのリソースはプロジェクト名を接頭辞として使用します：
- **スタック名**: `{ProjectName}-{Env}` （例: MyAwesomeApp-Dev）
- **DynamoDBテーブル**: `{project-name}-items-{env}`
- **Lambda関数**: `{project-name}-crud-{env}`
- **API Gateway**: `{project-name}-api-{env}`
- **S3バケット**: `{project-name}-frontend-{env}-{account-id}`

### デプロイ後の出力
デプロイ後、CDKの出力に以下のURLが表示されます：

- **CloudFront URL**: CloudFrontのディストリビューションURL（フロントエンド）
- **API Gateway URL**: API GatewayのエンドポイントURL（バックエンド）
- **DynamoDB Table Name**: 作成されたDynamoDBテーブル名

### API仕様
- `GET /items` - 全アイテムの取得
- `POST /items` - 新規アイテムの作成
- `GET /items/{id}` - 特定アイテムの取得
- `PUT /items/{id}` - アイテムの更新
- `DELETE /items/{id}` - アイテムの削除

## ⚙️ 環境変数設定

### 必須の環境変数
```bash
# .envファイルに設定
PROJECT_NAME=my-serverless-app  # プロジェクト固有の名前（小文字とハイフン）
```

### オプションの環境変数
```bash
AWS_REGION=us-east-1           # AWSリージョン（デフォルト: us-east-1）
AWS_PROFILE=default            # AWS CLIプロファイル名
```

### GitHub Actionsでの設定（CI/CD使用時）
GitHub Secretsに以下を設定：
- `PROJECT_NAME`: プロジェクト名
- `AWS_ACCESS_KEY_ID`: AWSアクセスキー
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットキー
- `AWS_REGION`: AWSリージョン（オプション）

## 🔒 セキュリティ設定

### AWS認証
CDKは以下の優先順位でAWS認証情報を使用します：
1. 環境変数（`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`）
2. AWS Profile（`AWS_PROFILE`環境変数または`--profile`オプション）
3. デフォルトプロファイル

### 現在実装済みのセキュリティ機能
- S3バケットのパブリックアクセスブロック
- CloudFront Origin Access Identity (OAI)
- HTTPSリダイレクト
- API GatewayのCORS設定

## 📚 ドキュメント

### 主要ドキュメント
- `docs/cdk-simplification-guide.md` - CDKシンプル化ガイド
- `docs/local-cicd-sync-guide.md` - ローカル/CI-CD同期化ガイド
- `docs/cloudfront-custom-domain-guide.md` - カスタムドメイン設定ガイド
- `docs/fullstack-serverless-template.md` - テンプレート詳細

## 🔄 CI/CDパイプライン（今後実装予定）

GitHub Actionsを使用した自動デプロイパイプラインの実装を予定しています。
詳細は`docs/local-cicd-sync-guide.md`を参照してください。

## ✅ 初回セットアップチェックリスト

- [ ] Node.js 20.x以上のインストール
- [ ] AWS CLIのインストールと設定
- [ ] リポジトリのクローン
- [ ] `npm install`の実行
- [ ] AWS認証情報の設定
- [ ] 初回CDKブートストラップの実行（必要な場合）
  ```bash
  npx cdk bootstrap
  ```

## 📚 関連ドキュメント

- [プロジェクトロードマップ](docs/ROADMAP.md)
- [ベストプラクティス](docs/guides/best-practices.md)
- [CDKシンプル化ガイド](docs/guides/cdk-simplification.md)
- [ローカル/CI-CD同期ガイド](docs/guides/local-cicd-sync.md)

## 🎆 次のステップ

### 現在実装済み
- ✅ 基本的なCRUD API
- ✅ シンプルなフロントエンド
- ✅ DynamoDBとの連携
- ✅ CloudFront配信

### 今後の拡張案
1. **認証・認可の追加**
   - AWS Cognitoの統合
   - APIキー認証

2. **フロントエンドのアップグレード**
   - お好みのフレームワーク（React/Vue/Next.js等）への移行
   - より高度なUIの実装

3. **機能拡張**
   - ファイルアップロード（S3統合）
   - リアルタイム更新（WebSocket/AppSync）
   - 検索機能（OpenSearch統合）

4. **運用機能**
   - CloudWatchダッシュボード
   - X-Rayトレーシング
   - CI/CDパイプライン

## 👥 コントリビュート

プルリクエスト歓迎！以下のガイドラインに従ってください：

1. フォークしてブランチを作成
2. 変更を加えてコミット
3. テストがパスすることを確認
4. プルリクエストを作成

## 📝 ライセンス

MIT License
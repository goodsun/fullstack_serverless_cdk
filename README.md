# fullstack-serverless-cdkセットアップガイド

## 📋 プロジェクト概要

フルスタックサーバーレスアプリケーションを素早く構築するためのCDKテンプレート。

### 特徴
- Lambda + DynamoDB + S3 + CloudFrontの統合構成
- CI/CDパイプライン事前設定
- ベストプラクティス組み込み済み
- モノレポ構成での管理

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

# 環境設定ファイルの作成
cp .env.example .env
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
├── .github/
│   └── workflows/
│       ├── deploy.yml          # CI/CDパイプライン
│       └── pr-check.yml        # PRチェック
├── infrastructure/             # CDKコード
│   ├── bin/
│   │   └── app.ts              # CDKアプリエントリポイント
│   ├── lib/
│   │   └── fullstack-app-stack.ts  # メインスタック定義
│   ├── cdk.json                # CDK設定
│   └── package.json
├── backend/                    # Lambda関数
│   ├── src/
│   │   ├── handlers/           # APIハンドラー
│   │   ├── services/           # ビジネスロジック
│   │   └── utils/              # ユーティリティ
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # フロントエンド
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/                       # ドキュメント
│   ├── cdk-simplification-guide.md
│   ├── cloudfront-custom-domain-guide.md
│   ├── local-cicd-sync-guide.md
│   └── fullstack-serverless-template.md
├── scripts/                    # ビルド・デプロイスクリプト
├── package.json               # ルートpackage.json
├── .env.example               # 環境変数テンプレート
└── README.md
```

## 🔧 開発コマンド

### ローカル開発
```bash
# 全依存関係のインストール
npm run install:all

# ビルド
npm run build

# テスト
npm run test

# Lintチェック
npm run lint

# 型チェック
npm run typecheck
```

### デプロイ
```bash
# 開発環境へのデプロイ
npm run deploy:dev

# ステージング環境へのデプロイ
npm run deploy:staging

# 本番環境へのデプロイ（GitHub Actions推奨）
npm run deploy:prod

# スタックの削除
npm run destroy:dev
```

## 🌐 エンドポイント

デプロイ後、以下のURLでアクセス可能：

- **CloudFront URL**: `https://d1234abcd5678.cloudfront.net`
- **API Gateway URL**: `https://xxxxxxxxxx.execute-api.region.amazonaws.com/stage`

## 🔒 セキュリティ設定

### GitHub Secretsの設定
以下のSecretsをGitHubリポジトリに設定：

```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### 環境変数
`.env`ファイルに以下を設定：

```bash
STAGE=dev
AWS_REGION=us-east-1
AWS_PROFILE=your-profile
```

## 📚 ドキュメント

### 主要ドキュメント
- `docs/cdk-simplification-guide.md` - CDKシンプル化ガイド
- `docs/local-cicd-sync-guide.md` - ローカル/CI-CD同期化ガイド
- `docs/cloudfront-custom-domain-guide.md` - カスタムドメイン設定ガイド
- `docs/fullstack-serverless-template.md` - テンプレート詳細

## 🔄 CI/CDパイプライン

### 自動デプロイフロー
1. `develop`ブランチへのpush → `dev`環境へ自動デプロイ
2. `main`ブランチへのpush → `prod`環境へ自動デプロイ
3. 手動トリガーで任意の環境へデプロイ可能

### パイプライン構成
1. **Test Job**: テスト・Lint・型チェック
2. **Build Job**: フロントエンド・バックエンドのビルド
3. **Deploy Job**: CDKデプロイ → S3同期 → CloudFront無効化

## ✅ チェックリスト

### 初回セットアップ
- [ ] リポジトリのクローン
- [ ] 依存関係のインストール
- [ ] AWS認証情報の設定
- [ ] 環境変数の設定
- [ ] GitHub Secretsの設定

### デプロイ前確認
- [ ] ビルドが成功するか
- [ ] テストがパスするか
- [ ] Lintエラーがないか
- [ ] 型エラーがないか

## 🎆 次のステップ

1. **フロントエンドの実装**
   - React/Vue/Next.jsの選択
   - UIコンポーネントの作成

2. **APIの実装**
   - RESTful APIの設計
   - 認証・認可の実装

3. **カスタムドメインの設定**
   - SSL証明書の取得
   - CloudFrontの設定更新

## 👥 コントリビュート

プルリクエスト歓迎！以下のガイドラインに従ってください：

1. フォークしてブランチを作成
2. 変更を加えてコミット
3. テストがパスすることを確認
4. プルリクエストを作成

## 📝 ライセンス

MIT License
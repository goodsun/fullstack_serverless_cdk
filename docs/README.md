# serverless-cdk - 汎用サーバーレス基盤

## 概要
shareNOTEプロジェクトから抽出した、再利用可能なサーバーレスアプリケーション基盤。
AWS CDKを使用して、Lambda + API Gateway + DynamoDBの構成を素早く立ち上げられる。

## 背景
- shareNOTEの開発で実証されたCDK構成
- 新規サービス開発時の「またゼロからCDK書くのか...」問題を解決
- スモールスタート原則に最適な基盤
- Lambda + API Gateway + DynamoDB + S3の黄金構成

## 主要機能
1. **即座に使えるサーバーレステンプレート**
   - Lambda (Node.js 20.x/TypeScript)
   - API Gateway
   - DynamoDB
   - S3 (ファイルストレージ/静的ホスティング)

2. **環境別デプロイ対応**
   - dev/prod環境の分離
   - 環境変数による設定管理

3. **標準化されたプロジェクト構造**
   ```
   serverless-cdk/
   ├── bin/          # CDKエントリーポイント
   ├── lib/          # CDKスタック定義
   ├── src/          # Lambda関数コード
   │   ├── handler.ts
   │   └── services/
   ├── test/         # テストコード
   └── scripts/      # デプロイ・運用スクリプト
   ```

4. **ベストプラクティス組み込み済み**
   - TypeScript設定
   - ESLint/Prettier設定
   - GitHub Actions CI/CD
   - 構造化ログ

## 想定される使用方法
```bash
# テンプレートからプロジェクト作成
npx create-serverless-cdk my-new-service

# 環境構築
cd my-new-service
npm install

# ローカル開発
npm run dev

# デプロイ
npm run deploy:dev
npm run deploy:prod
```

## 提供する価値
- **開発開始時間の短縮**: 0→API稼働まで30分以内
- **統一された構成**: チーム内での標準化
- **実証済みアーキテクチャ**: shareNOTEで実運用検証済み

## 実装優先度
- 開発準備度: ★★★★☆（shareNOTEから抽出可能）
- 市場ニーズ: ★★★★☆（サーバーレス開発の需要高）
- 技術的実現性: ★★★★★（既に動作実績あり）

## 次のステップ
1. shareNOTEから汎用部分を抽出
2. テンプレート化とCLIツール作成
3. ドキュメント整備
4. npm公開
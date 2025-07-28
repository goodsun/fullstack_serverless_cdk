# ローカル開発ガイド

## 概要

AWSにデプロイせずにローカル環境でフロントエンドとAPIをテストする方法を説明します。

## 前提条件

- Node.js 20.x以上
- AWS SAM CLI（APIのローカル実行用）
- Docker（オプション：DynamoDB Local用）

## セットアップ

### 1. AWS SAM CLIのインストール

```bash
# macOS
brew install aws-sam-cli

# Windows/Linux
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### 2. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# CDKテンプレートの生成
npm run synth
```

## APIのローカルテスト

### 1. SAM Localでの実行

```bash
# API Gatewayをローカルで起動
sam local start-api \
  --template cdk.out/$(ls cdk.out/ | grep -E ".*\.template\.json$" | head -1) \
  --env-vars env.json
```

### 2. 環境変数ファイルの作成

```bash
cat > env.json << EOF
{
  "CrudHandler": {
    "TABLE_NAME": "local-items-table",
    "REGION": "us-east-1",
    "ENV": "dev"
  }
}
EOF
```

### 3. APIのテスト

```bash
# ヘルスチェック
curl http://localhost:3000/items

# アイテムの作成
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Item",
    "description": "ローカルテスト",
    "category": "test"
  }'
```

## フロントエンドのローカルテスト

### 1. HTTPサーバーの起動

```bash
# 方法1: Python（macOS/Linuxに標準搭載）
cd frontend
python3 -m http.server 8080

# 方法2: Node.jsのhttp-server
npx http-server frontend -p 8080

# 方法3: ライブリロード機能付き
cd frontend
npx live-server --port=8080
```

### 2. ブラウザでアクセス

1. http://localhost:8080 を開く
2. API URL入力欄に `http://localhost:3000` を入力
3. 「Save」をクリック

## DynamoDB Localを使用した完全なローカル環境

### 1. DynamoDB Localの起動

```bash
# Dockerを使用
docker run -p 8000:8000 amazon/dynamodb-local

# または、スタンドアロン版
mkdir -p ~/dynamodb-local
cd ~/dynamodb-local
wget https://s3.ap-northeast-1.amazonaws.com/dynamodb-local-tokyo/dynamodb_local_latest.tar.gz
tar -xzf dynamodb_local_latest.tar.gz
java -jar DynamoDBLocal.jar -sharedDb
```

### 2. ローカルテーブルの作成

```bash
aws dynamodb create-table \
  --table-name local-items-table \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### 3. Lambda関数の環境変数を更新

`env.json`を編集：

```json
{
  "CrudHandler": {
    "TABLE_NAME": "local-items-table",
    "REGION": "us-east-1",
    "ENV": "dev",
    "DYNAMODB_ENDPOINT": "http://host.docker.internal:8000"
  }
}
```

### 4. crud.tsの修正（ローカル開発用）

```typescript
// backend/src/handlers/crud.ts の先頭に追加
const dynamoDBConfig: any = { region: process.env.REGION };
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDBConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}
const client = new DynamoDBClient(dynamoDBConfig);
```

## 便利な開発スクリプト

### package.jsonに追加

```json
{
  "scripts": {
    "dev:api": "sam local start-api --template cdk.out/*.template.json --env-vars env.json",
    "dev:frontend": "cd frontend && npx live-server --port=8080",
    "dev:db": "docker run -d -p 8000:8000 amazon/dynamodb-local",
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:frontend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### 使用方法

```bash
# DynamoDB Localを起動
npm run dev:db

# API + フロントエンドを同時起動
npm run dev
```

## トラブルシューティング

### CORS エラーが発生する場合

ブラウザのCORS制限を一時的に無効化：

```bash
# Chrome（macOS）
open -n -a "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome_dev"

# Chrome（Windows）
chrome.exe --disable-web-security --user-data-dir="C:/tmp/chrome_dev"
```

### ポートが既に使用されている場合

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8080

# プロセスを終了
kill -9 <PID>
```

### DynamoDB Localに接続できない場合

```bash
# DynamoDB Localの動作確認
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1

# Dockerコンテナの確認
docker ps
```

## ベストプラクティス

1. **環境変数ファイルはコミットしない**
   ```bash
   echo "env.json" >> .gitignore
   ```

2. **ローカル用の設定を分離**
   - 本番コードに影響しないよう、環境変数で切り替え

3. **定期的にAWS環境でもテスト**
   - ローカルでは再現できない問題もあるため

4. **ローカルDBのデータをクリア**
   ```bash
   # DynamoDB Localのデータ削除
   docker stop $(docker ps -q --filter ancestor=amazon/dynamodb-local)
   docker rm $(docker ps -aq --filter ancestor=amazon/dynamodb-local)
   ```

## 関連ドキュメント

- [AWS SAM CLI ドキュメント](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [DynamoDB Local ドキュメント](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
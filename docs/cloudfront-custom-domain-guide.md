# CloudFrontカスタムドメイン設定ガイド

## 📋 概要

CloudFrontのデフォルトドメイン（*****.cloudfront.net）からカスタムドメインへの移行手順書。
スモールスタート原則に基づき、段階的なアプローチを推奨。

## 🚀 Phase 1: デフォルトドメインで開始

### 初期状態
```
https://d1234abcd5678.cloudfront.net  # 自動生成されるドメイン
```

### メリット
- 証明書設定不要で即座に利用可能
- HTTPS対応済み
- 追加コストなし
- 設定の複雑さを回避

### デメリット
- URLが覚えにくい
- ブランディングに適さない

### この段階での運用
```bash
# デプロイ後にURLを取得
aws cloudformation describe-stacks \
  --stack-name FullstackAppStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text
```

## 📈 Phase 2: カスタムドメイン移行の判断基準

### 移行を検討すべきタイミング
- [ ] 月間アクティブユーザーが1,000人を超えた
- [ ] マーケティング活動を本格化する
- [ ] 有料プランを開始する
- [ ] ブランド認知度向上が必要

### 事前準備チェックリスト
- [ ] ドメインを所有している
- [ ] DNSプロバイダーへのアクセス権がある
- [ ] サービスのダウンタイムを最小化する計画がある

## 🔧 Phase 3: SSL証明書の作成

### オプション1: AWS Console経由（推奨）

#### 手順
1. **AWS Consoleにログイン**
   ```
   https://console.aws.amazon.com/
   ```

2. **リージョンをus-east-1に変更**
   - 右上のリージョン選択から「米国東部（バージニア北部）」を選択
   - ⚠️ **必ず us-east-1 を選択すること！**

3. **ACMサービスに移動**
   - サービス検索で「Certificate Manager」を検索
   - 「証明書をリクエスト」をクリック

4. **証明書の設定**
   ```
   証明書タイプ: パブリック証明書をリクエスト
   ドメイン名: app.example.com
   検証方法: DNS検証（推奨）
   ```

5. **DNS検証の実施**
   - ACMが提供するCNAMEレコードをDNSに追加
   - 例:
   ```
   名前: _1234567890abcdef.app.example.com
   タイプ: CNAME
   値: _0987654321fedcba.acm-validations.aws.
   ```

6. **検証完了を待つ**
   - 通常5-30分で完了
   - ステータスが「発行済み」になることを確認

7. **証明書ARNをメモ**
   ```
   arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
   ```

### オプション2: CDK経由（上級者向け）

#### 別スタックで証明書を管理
```typescript
// infrastructure/lib/certificate-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';

export class CertificateStack extends Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, {
      ...props,
      env: {
        ...props?.env,
        region: 'us-east-1',  // 必須！
      },
    });

    // Route 53ホストゾーンを参照（既存のものを使用）
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'example.com',
    });

    // 証明書作成
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'app.example.com',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // 証明書ARNを出力
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      exportName: 'AppCertificateArn',
    });
  }
}
```

#### デプロイ
```bash
# 証明書スタックを先にデプロイ
cd infrastructure
STAGE=prod npx cdk deploy CertificateStack --region us-east-1
```

## 🌐 Phase 4: CloudFront設定の更新

### CDKスタックの修正

```typescript
// infrastructure/lib/fullstack-app-stack.ts に追加
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class FullstackAppStack extends Stack {
  constructor(scope: Construct, id: string, props: FullstackAppStackProps) {
    super(scope, id, props);

    // ... 既存のコード ...

    // 証明書を参照（手動作成の場合）
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:us-east-1:123456789012:certificate/...'
    );

    // CloudFrontディストリビューション（修正版）
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      // 既存の設定に追加
      domainNames: ['app.example.com'],  // カスタムドメイン
      certificate: certificate,           // SSL証明書
      // ... 他の既存設定 ...
    });

    // カスタムドメイン用の出力を追加
    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: `https://app.example.com`,
      description: 'Custom domain URL',
    });
  }
}
```

### デプロイ
```bash
# 更新されたスタックをデプロイ
STAGE=prod npx cdk deploy FullstackAppStack-prod
```

## 🔗 Phase 5: DNS設定

### Route 53を使用する場合

```typescript
// CDKに追加（Route 53管理の場合）
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

// ホストゾーンを参照
const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
  domainName: 'example.com',
});

// Aレコード（エイリアス）を作成
new route53.ARecord(this, 'AliasRecord', {
  zone: hostedZone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});
```

### 外部DNSプロバイダーを使用する場合

#### サブドメイン（app.example.com）の場合
```
タイプ: CNAME
名前: app
値: d1234abcd5678.cloudfront.net
TTL: 3600
```

#### ルートドメイン（example.com）の場合
- CNAMEは使用不可
- DNSプロバイダーがALIAS/ANAMEをサポートしている必要あり
- サポートしていない場合はRoute 53への移行を検討

## ✅ Phase 6: 動作確認

### 1. DNS伝播の確認
```bash
# DNSレコードの確認
dig app.example.com

# 期待される応答
;; ANSWER SECTION:
app.example.com.    3600    IN    CNAME    d1234abcd5678.cloudfront.net.
```

### 2. HTTPS接続の確認
```bash
# SSL証明書の確認
curl -vI https://app.example.com

# 証明書情報を確認
openssl s_client -connect app.example.com:443 -servername app.example.com
```

### 3. コンテンツ配信の確認
- ブラウザで https://app.example.com にアクセス
- 開発者ツールでレスポンスヘッダーを確認
- `x-cache: Hit from cloudfront` が表示されることを確認

## 🔄 Phase 7: 移行完了後の作業

### 旧URLからのリダイレクト設定
```javascript
// フロントエンドでの対応例
if (window.location.hostname.includes('cloudfront.net')) {
  window.location.href = 'https://app.example.com' + window.location.pathname;
}
```

### モニタリング設定
- CloudFrontのアクセスログを有効化
- カスタムドメインへのトラフィックを監視
- SSL証明書の有効期限アラート設定

## ⚠️ トラブルシューティング

### 問題: 証明書が「検証保留中」のまま
**解決策:**
- DNS設定が正しいか確認
- TTLが長い場合は待つ（最大72時間）
- Route 53を使用すると自動検証で高速

### 問題: カスタムドメインにアクセスできない
**解決策:**
```bash
# CloudFrontの設定確認
aws cloudfront get-distribution --id ABCDEFG123456

# Aliasesにカスタムドメインが含まれているか確認
```

### 問題: HTTPSでアクセスできない
**解決策:**
- 証明書が正しくアタッチされているか確認
- 証明書のドメイン名が一致しているか確認
- CloudFrontのビューワープロトコルポリシーを確認

## 📊 コスト影響

### 追加コスト
- ACM証明書: 無料
- Route 53ホストゾーン: $0.50/月
- DNSクエリ: $0.40/100万クエリ

### コスト最適化
- 外部DNSを使用すればRoute 53コストは不要
- CloudFrontの地域設定で配信コストを最適化

## 🎯 まとめ

1. **まずはデフォルトドメインで開始**
2. **サービスが成長したらカスタムドメインを検討**
3. **証明書は必ずus-east-1で作成**
4. **DNS設定は慎重に（特にTTL）**
5. **移行は段階的に実施**

この手順に従えば、リスクを最小限に抑えながらカスタムドメインへの移行が可能です。
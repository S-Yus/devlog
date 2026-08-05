# Yusei.dev

技術ツールの実行手順，トラブルシューティング，開発・研究の記録を公開する，静的な技術ブログ兼ポートフォリオサイトです。完成版の記事を **Guides**，検証途中の記録を **Devlog** として管理します。記事はCMSを使わずMarkdownで管理し，いいね数だけをCloudflare D1へ保存します。外部トラッキングは使用しません。

## 使用技術

- Astro（静的出力）/ TypeScript
- Astro Content Collections / Markdown
- `@astrojs/sitemap` / `@astrojs/rss`
- Pagefind
- CSS
- Cloudflare Pages Functions / D1
- GitHub Actions
- Cloudflare Pages

## 必要環境

- WSL2 Ubuntu
- Node.js 24
- npm
- Git

`.node-version`は`24`です。Astro自体の最低要件に合わせ，`package.json`のenginesは`>=22.12.0`としていますが，開発とCIではNode.js 24を使用します。

## WSL Ubuntuでのセットアップ

Node Version Manager（nvm）を利用する場合は，公式手順でnvmを導入した後に次を実行します。

```bash
nvm install 24
nvm use 24
node -v
npm -v
```

リポジトリを取得して依存関係を導入します。

```bash
git clone git@github.com:<YOUR_GITHUB_USER>/yusei-dev.git
cd yusei-dev
npm install
npm run dev
```

表示されたローカルURLをブラウザで開きます。開発環境では`draft: true`の記事も一覧と個別ページに表示されます。

## 記事を作成する

記事種別の判断，公開条件，Frontmatterの使い分けは[`CONTENT_GUIDE.md`](./CONTENT_GUIDE.md)にまとめています。

Guideは次のコマンドで作成します。

```bash
npm run new:guide -- install-lean-on-wsl
```

`src/content/guides/install-lean-on-wsl.md`がテンプレートから生成されます。

Devlogは次のコマンドで作成します。

```bash
npm run new:devlog -- first-distributed-llm-test
```

`src/content/devlog/first-distributed-llm-test.md`が生成されます。slugには小文字英数字と単語間のハイフンだけを使用できます。同名ファイルは上書きされません。

どちらも作成直後は`draft: true`です。本文を編集し，公開準備ができたらFrontmatterを次のように変更します。

```yaml
draft: false
```

Guideでは手順を実際に再検証したうえで，必要に応じて`status: verified`と`updatedAt`も更新します。Frontmatterの必須項目や列挙値に誤りがあると型検査またはビルドが失敗します。

## 検査と本番ビルド

型とコンテンツだけを確認する場合:

```bash
npm run check
```

本番と同じ処理を確認する場合:

```bash
npm run build
```

`npm run build`は`astro check`，`astro build`，`pagefind --site dist`の順に実行します。本番ビルドでは`draft: true`の記事が一覧，個別ページ，Sitemap，RSS，Pagefindから除外されます。

Pagefindを含む生成結果を確認するには次を実行し，表示されたURLの`/search/`を開きます。

```bash
npm run preview
```

たとえば`/search/?q=Astro`へ直接アクセスしても検索できます。`astro dev`ではまだPagefindのインデックスが生成されていないため，検索確認には本番ビルド後のプレビューを使用してください。

## GitHubへの初回push

GitHub上に空の`yusei-dev`リポジトリを作成し，次を実行します。GitHub CLIを使う場合，公開範囲を明示しないときはprivateを推奨します。

```bash
git remote add origin git@github.com:<YOUR_GITHUB_USER>/yusei-dev.git
git push -u origin main
```

GitHub CLIで新規作成する場合:

```bash
gh repo create yusei-dev --private --source=. --remote=origin --push
```

Pull Requestと`main`へのpushではGitHub ActionsがNode.js 24で`npm ci`，`npm run check`，`npm run build`を実行します。デプロイは行いません。

## Cloudflare Pagesとの接続

Cloudflare Dashboardの **Workers & Pages** から **Create application → Pages → Connect to Git** を選び，GitHubの`yusei-dev`を接続します。ビルド設定は次のとおりです。

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=24` |

フレームワークプリセットを選ぶ場合はAstroを選択します。GitHub Actionsからはデプロイせず，Cloudflare PagesのGit連携に任せます。

### いいね機能用D1の設定

いいね数はCloudflare D1へ保存します。初回だけ次の設定が必要です。

1. Cloudflare Dashboardで **Storage & Databases → D1 SQL Database → Create database** を開く。
2. データベース名を`yusei-dev-likes`として作成する。
3. 作成したデータベースの **Console** を開く。
4. `migrations/0001_create_article_likes.sql`の内容を貼り付けて実行する。
5. **Workers & Pages → yusei-dev → Bindings → Add binding** を開く。
6. 種別に **D1 database** を選ぶ。
7. Variable nameを`DB`にする。
8. D1 databaseに`yusei-dev-likes`を選び，保存する。
9. Preview環境にも同じ`DB` bindingを設定する。
10. **Deployments**から最新コミットを再デプロイする。

APIは`/api/likes`で提供されます。記事ページでは同じブラウザから同じ記事への重複評価を防ぎ，一覧ページではD1の件数を使って新しい順，古い順，高評価順に並べ替えます。ログイン機能はなく，IPアドレスは保存しません。ブラウザの保存データを消した場合やAPIを直接呼び出した場合まで完全に防ぐ仕組みではありません。

ローカルの`npm run dev`と`npm run preview`ではPages FunctionsとD1が起動しないため，いいねAPIの最終確認はCloudflareのPreview deploymentまたは本番環境で行います。

### `yusei.dev`のカスタムドメイン

Pagesプロジェクトの **Custom domains → Set up a custom domain** で`yusei.dev`を入力します。ドメインが同じCloudflareアカウントで管理されている場合は案内に従ってDNSレコードを自動設定します。別のDNS事業者を使う場合は，Cloudflareが画面に表示するCNAMEの値をDNSへ登録します。HTTPSが有効になり，`https://yusei.dev`で表示できることを確認します。

## Google Search Console

1. Search Consoleでドメインプロパティ`yusei.dev`を追加する。
2. 表示されたTXTレコードをCloudflare DNSへ追加し，所有権を確認する。
3. HTTPSでサイトが公開された後，**サイトマップ**を開く。
4. `https://yusei.dev/sitemap-index.xml`を送信する。
5. URL検査でトップページと代表的な記事が取得可能か確認する。

`public/robots.txt`からも同じSitemapを参照しています。

## 通常の記事公開フロー

```bash
npm run new:guide -- article-slug
npm run dev
npm run build
git add .
git commit -m "Add guide: article title"
git push
```

push後，GitHub Actionsが品質確認を行い，Cloudflare Pagesが`main`を自動ビルドして公開します。Devlogの場合は最初のコマンドを`npm run new:devlog -- article-slug`へ変更します。

## トラブルシューティング

### Node.jsのバージョンエラー

`node -v`を確認し，Node.js 24へ切り替えてから`npm install`をやり直します。nvmなら`nvm use 24`を実行します。

### Frontmatterの検証エラー

エラーに表示されたMarkdownを開き，必須項目，日付，`status`，`difficulty`，`draft`の型を確認します。許可値は`src/content.config.ts`に定義されています。

### 検索結果が表示されない

`npm run build`が最後まで成功し，`dist/pagefind/`が存在することを確認します。`npm run dev`ではなく`npm run preview`を使ってください。`draft: true`の記事は本番検索に含まれません。

### Cloudflare Pagesでビルドが失敗する

ビルド設定と`NODE_VERSION=24`を確認します。ローカルで`npm ci && npm run build`を実行し，同じコミットが成功するか比較します。

### SitemapやRSSが見つからない

本番ビルド後に`dist/sitemap-index.xml`と`dist/rss.xml`を確認します。公開URLはそれぞれ`/sitemap-index.xml`と`/rss.xml`です。

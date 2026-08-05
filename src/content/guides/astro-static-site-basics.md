---
title: "Astroで軽量な静的サイトを構築する(テスト投稿)"
description: "Astroの静的出力を確認し，ローカルで本番ビルドを検証する最小手順"
publishedAt: 2026-08-05
updatedAt: 2026-08-05
status: verified
category: development
tags:
  - Astro
  - TypeScript
  - Static Site
environment:
  - "Windows 11"
  - "WSL2 Ubuntu"
  - "Node.js 24"
difficulty: beginner
estimatedMinutes: 10
draft: false
---

## この記事でできること

Astroプロジェクトを静的HTMLとしてビルドし，生成物をローカルで確認できる

## 前提条件

WSL2 Ubuntuのターミナルを操作できること

## 使用環境

- Windows 11
- WSL2 Ubuntu
- Node.js 24
- npm

## 必要なもの

Node.jsとnpm

## 手順

### 1. 依存関係を導入する

```bash
npm install
```

### 2. 開発サーバーを起動する

```bash
npm run dev
```

表示されたローカルURLをブラウザで開く。Markdownを保存すると，変更がページへ反映される。

### 3. 本番用の生成物を作る

```bash
npm run build
```

このサイトでは型検査，Astroの静的ビルド，Pagefindの検索インデックス生成が順番に実行される。

## 実行結果

処理が成功すると`dist/`にHTMLが生成され，`dist/pagefind/`に日本語を検索できるインデックスが作られる。

## トラブルシューティング

### `Astro requires Node.js v22.12.0 or higher.`

**原因**

使用中のNode.jsがAstroの対応バージョンより古い状態である

**解決方法**

Node.js 24へ切り替え，`node -v`で有効なバージョンを確認してから再実行。

## 元に戻す方法

生成物だけを消したい場合は`dist/`を削除。Markdownの原稿には影響しない。

## 補足と制約

開発サーバーは執筆確認用。公開前には必ず`npm run build`を実行。

## 参考資料

- [Astro Documentation](https://docs.astro.build/)
- [Pagefind Documentation](https://pagefind.app/)

## 更新履歴

- 2026-08-05: 初版公開

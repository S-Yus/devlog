import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeChanges,
  appendHistory,
  countHistoryEntries,
  splitDocument,
} from './history-rules.mjs';

const document = (body, extra = '') => `---
title: "Test"
description: "Test article"
publishedAt: 2026-08-10
status: read
history:
  - at: "2026-08-10T12:00:00+09:00"
    summary: "初版公開"
draft: false
${extra}---
${body}`;

test('句読点・空白・見出し階層・コメントだけの変更は無視する', () => {
  const before = document('## 結果\n\n精度は向上した。\n<!-- old -->\n');
  const after = document('### 主な結果\n\n精度は， 向上した。\n<!-- new -->\n');
  assert.equal(analyzeChanges(before, after).material, false);
});

test('短い表記修正は無視する', () => {
  const before = document('## 結果\n\nこの手法は良い。');
  const after = document('## 結果\n\nこの手法はかなり良い。');
  assert.equal(analyzeChanges(before, after).material, false);
});

test('長い説明の追加は記録する', () => {
  const before = document('## 結果\n\n結果を記録する。');
  const after = document(`## 結果

結果を記録する。追加実験では複数のデータセットを使用し，各モデルの予測値と実測値の差を比較した。その結果，同じ傾向が確認できた。`);
  const result = analyzeChanges(before, after);
  assert.equal(result.material, true);
  assert.match(result.summary, /結果/);
});

test('コードの1文字変更も記録する', () => {
  const before = document('## 実装\n\n```js\nconst n = 1;\n```');
  const after = document('## 実装\n\n```js\nconst n = 2;\n```');
  const result = analyzeChanges(before, after);
  assert.equal(result.material, true);
  assert.ok(result.protectedKinds.includes('コード例'));
});

test('数式の1文字変更も記録する', () => {
  const before = document('## 手法\n\n$$P = aS + b$$');
  const after = document('## 手法\n\n$$P = a\\log S + b$$');
  const result = analyzeChanges(before, after);
  assert.equal(result.material, true);
  assert.ok(result.protectedKinds.includes('数式'));
});

test('数値の変更は短くても記録する', () => {
  const before = document('## 結果\n\n精度は80%だった。');
  const after = document('## 結果\n\n精度は81%だった。');
  const result = analyzeChanges(before, after);
  assert.equal(result.material, true);
  assert.ok(result.protectedKinds.includes('数値・バージョン'));
});

test('意味を反転させる変更は短くても記録する', () => {
  const before = document('## 注意\n\nこの操作はできる。');
  const after = document('## 注意\n\nこの操作はできない。');
  const result = analyzeChanges(before, after);
  assert.equal(result.material, true);
  assert.ok(result.protectedKinds.includes('重要な表現'));
});

test('history: []に履歴を追加できる', () => {
  const source = `---\ntitle: "Test"\nhistory: []\ndraft: false\n---\nBody`;
  const updated = appendHistory(source, '2026-08-10T18:00:00+09:00', '初版公開');
  const frontmatter = splitDocument(updated).frontmatter;
  assert.equal(countHistoryEntries(frontmatter), 1);
  assert.match(updated, /summary: "初版公開"/);
});

test('既存のhistoryの末尾に追加できる', () => {
  const source = document('Body');
  const updated = appendHistory(source, '2026-08-11T18:00:00+09:00', '結果を追加');
  const frontmatter = splitDocument(updated).frontmatter;
  assert.equal(countHistoryEntries(frontmatter), 2);
  assert.match(updated, /summary: "結果を追加"/);
});

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeChanges,
  appendHistory,
  countHistoryEntries,
  getFrontmatterValue,
  splitDocument,
} from './history-rules.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArgument = args.find((argument) => !argument.startsWith('--'));

if (!fileArgument) {
  console.error('使い方: npm run history -- src/content/.../記事.md [--dry-run]');
  process.exit(1);
}

const filePath = resolve(projectRoot, fileArgument);
const relativePath = relative(projectRoot, filePath).split(sep).join('/');
if (!/^src\/content\/(?:guides|devlog|reading)\/.+\.md$/.test(relativePath)) {
  console.error('src/content/guides，devlog，reading内のMarkdownを指定してください。');
  process.exit(1);
}

const currentSource = await readFile(filePath, 'utf8');
const currentDocument = splitDocument(currentSource);
const draft = getFrontmatterValue(currentDocument.frontmatter, 'draft') !== 'false';
if (draft) {
  console.log('下書きのため更新履歴は追加しません。draft: falseにしてから再実行してください。');
  process.exit(0);
}

let previousSource;
try {
  previousSource = execFileSync('git', ['show', `HEAD:${relativePath}`], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  previousSource = undefined;
}

const currentHistoryCount = countHistoryEntries(currentDocument.frontmatter);
let summary;

if (!previousSource) {
  if (currentHistoryCount > 0) {
    console.log('新規記事の初版公開履歴はすでに追加されています。');
    process.exit(0);
  }
  summary = '初版公開';
} else {
  const previousDocument = splitDocument(previousSource);
  const previousHistoryCount = countHistoryEntries(previousDocument.frontmatter);
  if (currentHistoryCount > previousHistoryCount) {
    console.log('現在の変更に対する更新履歴はすでに追加されています。');
    process.exit(0);
  }

  if (currentHistoryCount === 0) {
    summary = '初版公開';
  } else {
    const result = analyzeChanges(previousSource, currentSource);
    if (!result.material) {
      console.log(`細かい変更のみです（正規化後の変更量: ${result.textChangeSize}文字）。更新履歴は追加しません。`);
      process.exit(0);
    }
    summary = result.summary;
  }
}

const now = new Date();
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]),
);
const timestamp = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;

if (dryRun) {
  console.log(`追加予定: ${timestamp} ${summary}`);
  process.exit(0);
}

await writeFile(filePath, appendHistory(currentSource, timestamp, summary), 'utf8');
console.log(`更新履歴を追加しました: ${summary}`);

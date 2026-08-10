import { diffChars } from 'diff';

export const TEXT_CHANGE_THRESHOLD = 40;

const FRONTMATTER_LABELS = {
  title: 'タイトル',
  description: '概要',
  sourceTitle: '参照元',
  sourceUrl: '参照先',
  status: '状態',
  readAt: '読了日',
};

const CRITICAL_TERMS = [
  'できない',
  'できる',
  '不可',
  '可能',
  '非推奨',
  '推奨',
  '必須',
  '任意',
  '廃止',
  '未対応',
  '対応',
  '成功',
  '失敗',
  '有効',
  '無効',
];

const normalizeLineEndings = (value) => value.replace(/\r\n?/g, '\n');
const stripComments = (value) => value.replace(/<!--[\s\S]*?-->/g, '');
const normalizeProtected = (value) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();

export function splitDocument(source) {
  const normalized = normalizeLineEndings(source);
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error('Frontmatterが見つかりません。');

  return {
    frontmatter: match[1],
    body: normalized.slice(match[0].length),
    opening: match[0],
  };
}

export function getFrontmatterValue(frontmatter, key) {
  const pattern = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm');
  const match = frontmatter.match(pattern);
  if (!match) return undefined;
  const value = match[1].trim();
  if (value === '' || value === 'null' || value === '~') return undefined;
  return value.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
}

export function countHistoryEntries(frontmatter) {
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => /^history:\s*(?:\[\])?\s*$/.test(line));
  if (start === -1) return 0;

  let count = 0;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[A-Za-z][\w-]*:/.test(line)) break;
    if (/^\s{2}-\s+at:/.test(line)) count += 1;
  }
  return count;
}

function extractMatches(source, pattern, group = 1) {
  return [...source.matchAll(pattern)]
    .map((match) => normalizeProtected(match[group] ?? match[0]))
    .filter(Boolean)
    .sort();
}

function countTerms(source) {
  const counts = {};
  for (const term of CRITICAL_TERMS) {
    counts[term] = source.split(term).length - 1;
  }
  return counts;
}

function extractProtected(body) {
  const source = stripComments(normalizeLineEndings(body));
  return {
    code: extractMatches(source, /```[^\n]*\n([\s\S]*?)```/g),
    math: [
      ...extractMatches(source, /\$\$([\s\S]*?)\$\$/g),
      ...extractMatches(source, /(?<!\$)\$([^$\n]+)\$(?!\$)/g),
    ].sort(),
    urls: extractMatches(source, /(?:https?:\/\/|\/)[^\s)>\]]+/g, 0),
    inlineCode: extractMatches(source, /`([^`\n]+)`/g),
    numbers: extractMatches(
      source,
      /\d+(?:[._-]\d+)*(?:\s?(?:%|[KMGTP]?B|ms|s|秒|分|件|倍))?/gi,
      0,
    ),
    criticalTerms: countTerms(source),
  };
}

function removeProtected(body) {
  return stripComments(normalizeLineEndings(body))
    .replace(/```[^\n]*\n[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/(?<!\$)\$[^$\n]+\$(?!\$)/g, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/https?:\/\/[^\s)>\]]+/g, '')
    .replace(/^#{1,6}\s+.*$/gm, '');
}

export function normalizeText(body) {
  return removeProtected(body)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, '');
}

function changedCharacterCount(before, after) {
  return diffChars(before, after).reduce(
    (total, part) => total + (part.added || part.removed ? part.value.length : 0),
    0,
  );
}

function valuesDiffer(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function sectionMap(body) {
  const sections = new Map();
  let current = '本文';
  let inFence = false;

  for (const line of stripComments(normalizeLineEndings(body)).split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    const heading = !inFence ? line.match(/^#{1,6}\s+(.+?)\s*$/) : null;
    if (heading) {
      current = heading[1].replace(/[*_`]/g, '').trim();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (!sections.has(current)) sections.set(current, []);
    sections.get(current).push(line);
  }

  return new Map(
    [...sections].map(([heading, lines]) => [heading, normalizeText(lines.join('\n'))]),
  );
}

function changedSections(beforeBody, afterBody) {
  const before = sectionMap(beforeBody);
  const after = sectionMap(afterBody);
  const headings = new Set([...before.keys(), ...after.keys()]);
  const changed = [];

  for (const heading of headings) {
    const oldText = before.get(heading) ?? '';
    const newText = after.get(heading) ?? '';
    if (oldText === newText) continue;
    changed.push({
      heading,
      kind: oldText === '' ? 'added' : newText === '' ? 'removed' : 'updated',
    });
  }

  return changed.filter(({ heading }) => heading !== '関連リンク');
}

function metadataChanges(beforeFrontmatter, afterFrontmatter) {
  return Object.entries(FRONTMATTER_LABELS)
    .filter(([key]) =>
      getFrontmatterValue(beforeFrontmatter, key) !== getFrontmatterValue(afterFrontmatter, key),
    )
    .map(([, label]) => label);
}

function protectedChanges(beforeBody, afterBody) {
  const before = extractProtected(beforeBody);
  const after = extractProtected(afterBody);
  const changes = [];

  if (valuesDiffer(before.code, after.code) || valuesDiffer(before.inlineCode, after.inlineCode)) {
    changes.push('コード例');
  }
  if (valuesDiffer(before.math, after.math)) changes.push('数式');
  if (valuesDiffer(before.urls, after.urls)) changes.push('参照先');
  if (valuesDiffer(before.numbers, after.numbers)) changes.push('数値・バージョン');
  if (valuesDiffer(before.criticalTerms, after.criticalTerms)) changes.push('重要な表現');

  return changes;
}

const joinJapanese = (items) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join('，')}と${items.at(-1)}`;

export function buildSummary(result) {
  const { metadata, protectedKinds, sections, textChanged } = result;
  const added = sections.filter((section) => section.kind === 'added');
  const removed = sections.filter((section) => section.kind === 'removed');

  if (metadata.length > 0 && protectedKinds.length === 0 && !textChanged) {
    return `${joinJapanese(metadata)}を更新`;
  }
  if (added.length === 1 && removed.length === 0 && protectedKinds.length === 0) {
    return `「${added[0].heading}」を追加`;
  }
  if (removed.length === 1 && added.length === 0 && protectedKinds.length === 0) {
    return `「${removed[0].heading}」を削除`;
  }

  const sectionNames = [...new Set(sections.map((section) => section.heading))].slice(0, 2);
  const targets = [...new Set([...metadata, ...protectedKinds])];
  if (textChanged && targets.length === 0) targets.push('説明');
  if (textChanged && targets.length > 0 && !targets.includes('説明')) targets.push('説明');

  const sectionLabel = sectionNames.length > 0
    ? `${sectionNames.map((name) => `「${name}」`).join('と')}${sections.length > 2 ? 'など' : ''}の`
    : '';

  if (targets.length > 0) return `${sectionLabel}${joinJapanese(targets.slice(0, 3))}を更新`;
  return '本文を大幅に改訂';
}

export function analyzeChanges(beforeSource, afterSource) {
  const before = splitDocument(beforeSource);
  const after = splitDocument(afterSource);
  const beforeText = normalizeText(before.body);
  const afterText = normalizeText(after.body);
  const textChangeSize = changedCharacterCount(beforeText, afterText);
  const metadata = metadataChanges(before.frontmatter, after.frontmatter);
  const protectedKinds = protectedChanges(before.body, after.body);
  const sections = changedSections(before.body, after.body);
  const textChanged = textChangeSize >= TEXT_CHANGE_THRESHOLD;
  const material = metadata.length > 0 || protectedKinds.length > 0 || textChanged;

  const result = { material, metadata, protectedKinds, sections, textChanged, textChangeSize };
  return { ...result, summary: material ? buildSummary(result) : undefined };
}

function escapeYamlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function appendHistory(source, at, summary) {
  const document = splitDocument(source);
  const lines = document.frontmatter.split('\n');
  const start = lines.findIndex((line) => /^history:\s*(?:\[\])?\s*$/.test(line));
  if (start === -1) throw new Error('Frontmatterにhistoryがありません。');

  const entry = [
    `  - at: "${escapeYamlString(at)}"`,
    `    summary: "${escapeYamlString(summary)}"`,
  ];

  if (/^history:\s*\[\]\s*$/.test(lines[start])) {
    lines.splice(start, 1, 'history:', ...entry);
  } else {
    let end = start + 1;
    while (end < lines.length && !/^[A-Za-z][\w-]*:/.test(lines[end])) end += 1;
    lines.splice(end, 0, ...entry);
  }

  return `---\n${lines.join('\n')}\n---\n${document.body}`;
}

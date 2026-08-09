export const READING_SOURCE_TYPE_VALUES = ['paper', 'article', 'documentation'] as const;
export const READING_STATUS_VALUES = ['unread', 'skimmed', 'read', 'deep-read'] as const;

export const READING_SOURCE_TYPE_OPTIONS = [
  { value: 'paper', label: '論文', listLabel: 'Paper' },
  { value: 'article', label: '記事', listLabel: 'Article' },
  { value: 'documentation', label: '公式資料', listLabel: 'Docs' },
] as const;

export const getReadingSourceTypeLabel = (value: string) =>
  READING_SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export const getReadingSourceTypeListLabel = (value: string) =>
  READING_SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.listLabel ?? value;

const READING_STATUS_LABELS: Record<(typeof READING_STATUS_VALUES)[number], string> = {
  unread: '未読',
  skimmed: 'ざっくり読み',
  read: '読了',
  'deep-read': '精読済み',
};

export const getReadingStatusLabel = (value: string) =>
  READING_STATUS_LABELS[value as keyof typeof READING_STATUS_LABELS] ?? value;

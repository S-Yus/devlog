export const READING_SOURCE_TYPE_VALUES = ['paper', 'article', 'documentation'] as const;

export const READING_SOURCE_TYPE_OPTIONS = [
  { value: 'paper', label: '論文', listLabel: 'Paper' },
  { value: 'article', label: '記事', listLabel: 'Article' },
  { value: 'documentation', label: '公式資料', listLabel: 'Docs' },
] as const;

export const getReadingSourceTypeLabel = (value: string) =>
  READING_SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export const getReadingSourceTypeListLabel = (value: string) =>
  READING_SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.listLabel ?? value;

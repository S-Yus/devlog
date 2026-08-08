import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentType = process.argv[2];
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const slug = process.argv[3] ?? (contentType === 'journal' ? today : undefined);
const settings = {
  guide: { template: 'guide.md', directory: 'guides' },
  devlog: { template: 'devlog.md', directory: 'devlog' },
  journal: { template: 'journal.md', directory: 'devlog' },
  reading: { template: 'reading.md', directory: 'reading' },
};

if (!Object.hasOwn(settings, contentType)) {
  console.error('記事種別は guide、devlog、journal、reading のいずれかを指定してください。');
  process.exit(1);
}

if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('slug は小文字英数字と単語間のハイフンだけで指定してください。');
  process.exit(1);
}

if (contentType === 'journal' && !/^\d{4}-\d{2}-\d{2}(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(slug)) {
  console.error('日誌のslugは YYYY-MM-DD または YYYY-MM-DD-topic の形式で指定してください。');
  process.exit(1);
}

const { template, directory } = settings[contentType];
const templatePath = resolve(projectRoot, 'templates', template);
const outputPath = resolve(projectRoot, 'src', 'content', directory, `${slug}.md`);
await mkdir(dirname(outputPath), { recursive: true });

try {
  const source = await readFile(templatePath, 'utf8');
  await writeFile(outputPath, source.replaceAll('{{date}}', today), {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(`Created: ${outputPath}`);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
    console.error(`既存ファイルは上書きしません: ${outputPath}`);
    process.exit(1);
  }
  throw error;
}

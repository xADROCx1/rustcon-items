#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'items.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const items = Array.isArray(catalog.items) ? catalog.items : [];
const seen = new Set();
const structuralErrors = [];

for (const [index, item] of items.entries()) {
  if (!item.name || !item.shortname || !item.icon) {
    structuralErrors.push(`item ${index} is missing name, shortname, or icon`);
  }
  if (seen.has(item.shortname)) structuralErrors.push(`duplicate shortname: ${item.shortname}`);
  seen.add(item.shortname);
}

async function checkIcon(item) {
  try {
    const response = await fetch(item.icon, { method: 'HEAD', redirect: 'follow' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.startsWith('image/')) {
      return `${item.shortname}: HTTP ${response.status}, ${contentType || 'no content type'}`;
    }
  } catch (error) {
    return `${item.shortname}: ${error.message}`;
  }
  return null;
}

async function main() {
  const failures = [];
  const concurrency = 20;
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      const failure = await checkIcon(item);
      if (failure) failures.push(failure);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`Validated ${items.length} items.`);
  console.log(`Structural errors: ${structuralErrors.length}`);
  console.log(`Broken icons: ${failures.length}`);
  for (const error of structuralErrors) console.error(error);
  for (const failure of failures) console.error(failure);
  if (structuralErrors.length || failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * RustCON items scraper
 * ----------------------
 * Pulls the latest Rust item list from SzyMig/Rust-item-list-JSON (community-
 * maintained mirror of Facepunch's items directory) and writes items.json.
 *
 * Runs monthly from .github/workflows/update-items.yml, but can also be run
 * locally:  node scripts/scrape-items.js
 *
 * If the SzyMig source goes stale we can swap SOURCE_URL for any other raw
 * JSON that matches the same shape ({ Name, shortname, itemid, Category }).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/SzyMig/Rust-item-list-JSON/main/Rust-Items.json';
const ICON_BASE  = 'https://cdn.rusthelp.com/images/public/';
const OUT_PATH   = path.join(__dirname, '..', 'items.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'rustcon-items-bot' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' from ' + url));
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function buildItems(src) {
  // Step 1: dedup by shortname (first occurrence wins)
  const seenSh = new Set();
  const items = [];
  for (const it of src) {
    const name = it.Name || it.name;
    const sh   = it.shortname;
    if (!name || !sh) continue;
    if (seenSh.has(sh)) continue;
    seenSh.add(sh);
    items.push({
      name,
      shortname: sh,
      id: it.itemid,
      category: it.Category || it.category || null,
      icon: ICON_BASE + encodeURIComponent(sh) + '.png'
    });
  }

  // Step 2: disambiguate colliding display names.
  // First occurrence keeps the clean name; subsequent ones get "(shortname)" appended
  // so the user can tell variants apart (e.g. multiple Sunglasses skins, repair kits).
  const nameCounts = {};
  for (const i of items) {
    const k = i.name.toLowerCase();
    nameCounts[k] = (nameCounts[k] || 0) + 1;
  }
  const seenName = new Set();
  for (const i of items) {
    const k = i.name.toLowerCase();
    if (nameCounts[k] > 1) {
      if (seenName.has(k)) i.name = `${i.name} (${i.shortname})`;
      else seenName.add(k);
    }
  }

  items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return items;
}

(async () => {
  try {
    console.log('Fetching', SOURCE_URL);
    const src = await fetchJson(SOURCE_URL);
    console.log('Source items:', src.length);

    const items = buildItems(src);
    console.log('Kept items:', items.length);

    // Diff against previous items.json (if any) to surface changes in CI logs
    let added = [], removed = [];
    if (fs.existsSync(OUT_PATH)) {
      try {
        const prev = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
        const prevSet = new Set((prev.items || []).map(i => i.shortname));
        const nextSet = new Set(items.map(i => i.shortname));
        added   = items.filter(i => !prevSet.has(i.shortname)).map(i => i.shortname);
        removed = [...prevSet].filter(s => !nextSet.has(s));
      } catch (_) {}
    }

    const out = {
      version: new Date().toISOString().slice(0, 10),
      updated: new Date().toISOString(),
      source: 'https://github.com/SzyMig/Rust-item-list-JSON',
      count: items.length,
      added,
      removed,
      items
    };

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
    console.log('Wrote', OUT_PATH);
    if (added.length)   console.log('Added:',   added.join(', '));
    if (removed.length) console.log('Removed:', removed.join(', '));
  } catch (err) {
    console.error('scrape-items failed:', err.message);
    process.exit(1);
  }
})();

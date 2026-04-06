# rustcon-items

Remote items catalog for the [RustCON](https://play.google.com/store/apps/details?id=com.xadroc.rustcon) admin console.

The RustCON app fetches `items.json` from this repo on launch so new Rust items appear in the **Give Items** tab without needing a new app build.

## How it works

1. `items.json` is the source of truth — a flat list of every giveable Rust item with name, shortname, itemid, category, and icon URL.
2. A GitHub Actions workflow (`.github/workflows/update-items.yml`) runs every **Thursday at 19:00 UTC** (2pm EST / 3pm EDT) and, if it's the first Thursday of the month, runs `scripts/scrape-items.js` to pull the latest list from [SzyMig/Rust-item-list-JSON](https://github.com/SzyMig/Rust-item-list-JSON) (a community mirror of Facepunch's items directory) and commits any changes.
3. The app fetches `https://xadrocx.github.io/rustcon-items/items.json` on launch, caches it in `localStorage`, and falls back to the bundled list if the fetch fails.

## Setup (one-time)

1. Push this folder to a new GitHub repo: `https://github.com/xADROCx/rustcon-items`
2. **Settings → Pages → Source: Deploy from branch → `main` / `(root)`** — this exposes `items.json` at `https://xadrocx.github.io/rustcon-items/items.json`
3. **Settings → Actions → General → Workflow permissions → "Read and write permissions"** — lets the bot commit updates
4. Go to **Actions → Update Rust Items → Run workflow** to trigger a manual run and confirm it works

## Files

| File | Purpose |
|---|---|
| `items.json` | The live items list the app fetches |
| `scripts/scrape-items.js` | Node scraper that rebuilds `items.json` |
| `.github/workflows/update-items.yml` | Monthly cron + manual trigger |

## Running the scraper locally

```bash
node scripts/scrape-items.js
```

Writes the current count, added shortnames, and removed shortnames to the console. Safe to run anytime.

## Swapping the data source

If `SzyMig/Rust-item-list-JSON` stops updating, edit `SOURCE_URL` in `scripts/scrape-items.js` to point at any other raw JSON matching the shape `{ Name, shortname, itemid, Category }[]`. Candidates:
- https://rusthelp.com/tools/admin/item-list (scrape HTML)
- https://github.com/OrangeWulf/Rust-Docs/blob/master/Items.md (markdown)
- https://www.corrosionhour.com/rust-item-list/ (scrape HTML)

## items.json shape

```json
{
  "version": "2026-04-06",
  "updated": "2026-04-06T18:12:00Z",
  "source": "https://github.com/SzyMig/Rust-item-list-JSON",
  "count": 1185,
  "added": ["supertea"],
  "removed": [],
  "items": [
    {
      "name": "Super Serum",
      "shortname": "supertea",
      "id": -1003665711,
      "category": "Food",
      "icon": "https://cdn.rusthelp.com/images/public/supertea.png"
    }
  ]
}
```

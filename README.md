# NextGP Social Automation

Automated social media posting for [NextGP](https://nextgp.app) F1 content.

## How It Works

```
┌───────────────────────────────────────────────────────────────┐
│                       CONTENT WORKFLOW                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│  │    K2    │      │  Google  │      │  GitHub  │            │
│  │ (Claude) │─────▶│  Sheet   │◀────▶│ Actions  │            │
│  └──────────┘      └──────────┘      └────┬─────┘            │
│       │                  │                 │                  │
│       │ Breaking         │ Draft → Ready   │ Hourly sync      │
│       │ News             │                 │                  │
│       ▼                  │                 ▼                  │
│  ┌──────────┐            │           ┌──────────┐            │
│  │  Chris   │────────────┘           │ Typefully│            │
│  │ (Review) │                        └────┬─────┘            │
│  └──────────┘                             │                  │
│                                           │ Auto-publish     │
│                                           ▼                  │
│                         ┌─────────────────────────────┐      │
│                         │     Social Platforms        │      │
│                         │  ┌───┐ ┌───────┐ ┌───────┐  │      │
│                         │  │ X │ │Threads│ │Mastodn│  │      │
│                         │  └───┘ └───────┘ └───────┘  │      │
│                         │       ┌───────┐             │      │
│                         │       │BlueSky│             │      │
│                         │       └───────┘             │      │
│                         └─────────────────────────────┘      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Sheet Format

| Platform | Content | Scheduled Date | Scheduled Time | Status | Notes | Source |
|----------|---------|----------------|----------------|--------|-------|--------|
| X | Post text... | 2/15/2026 | 2:00 PM | Draft | Optional notes | https://source-url |

### Platform Options
- `X` — Posts to X/Twitter only
- `Threads` — Posts to Threads only
- `Mastodon` — Posts to Mastodon only
- `Bluesky` — Posts to BlueSky only
- `All` — Posts to all 4 platforms at once

### Status Values
- `Draft` — Being reviewed, won't sync
- `Ready` — Will be synced to Typefully on next run
- `Sent` — Already pushed to Typefully (auto-archived every 6 hours)

### Time Format
- Dates: `2/15/2026` or `2026-02-15`
- Times: `2:00 PM` or `14:00`
- **Timezone: Chicago (America/Chicago)** — auto-converts to UTC

## GitHub Actions

### Sync (Hourly)
`.github/workflows/sync.yml`
- Runs every hour
- Picks up "Ready" rows → pushes to Typefully → marks as "Sent"

### Cleanup (Every 6 hours)
`.github/workflows/cleanup.yml`
- Moves "Sent" rows to Archive tab
- Keeps main sheet clean

## Local Development

```bash
# Install dependencies
npm install

# Run sync manually
npm run sync

# Run cleanup manually
npm run cleanup
```

## Required Secrets

Set in GitHub repo → Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `TYPEFULLY_API_KEY` | Typefully API key |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account JSON |

## Reference Data

- `reference/2026-grid.md` — Verified 2026 F1 driver grid
- Data source: [Jolpica F1 API](https://api.jolpi.ca/ergast/f1/)

## Content Sources

K2 monitors these for news:
- Motorsport.com RSS
- Reddit r/formula1
- Jolpica API (for results)

---

Built with 🏎️ for NextGP

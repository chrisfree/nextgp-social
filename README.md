# NextGP Social

Automated social media pipeline for the NextGP F1 app.

## How It Works

```
Google Sheet (source of truth)
        ↓
   Status = "Ready"
        ↓
GitHub Actions (every 15 min)
        ↓
   Typefully (schedule)
        ↓
   X / Mastodon / LinkedIn / Threads
```

## Quick Start

### Adding Content
1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw/edit)
2. Add rows with Status = `Draft`
3. When ready, change Status to `Ready`
4. GitHub Actions syncs to Typefully every 15 minutes
5. Review/approve in Typefully, then it publishes

### Sheet Columns
| Platform | Content | Media URL | Date | Time | Status | Notes |
|----------|---------|-----------|------|------|--------|-------|
| X | Tweet text... | | 2026-02-15 | 9:00 | Ready | |

⏰ **Times are Chicago time (Central)** — no conversion needed!

### Status Values
- `Draft` — Not ready (ignored by sync)
- `Ready` — Will be sent to Buffer on next sync
- `Sent` — Already in Buffer (set automatically)

## Connected Channels
- ✅ X/Twitter: @NextGP_app
- ✅ Mastodon: @nextGP@mastodon.xyz
- ⏳ Threads: @nextgp_app (pending)
- ⏳ Instagram: @nextgp_app (pending)

## Files

```
nextgp-social/
├── scripts/
│   ├── sync-to-typefully.js  # Main sync script
│   └── add-content.sh        # CLI to add posts via webhook
├── content/                   # Content batches
├── archive/                   # Old/unused code
├── PROJECT.md                # Detailed project docs
└── TASKS.md                  # Todo list
```

## Setup (One-Time)

See [PROJECT.md](PROJECT.md) for full setup instructions including:
- Google Service Account creation
- Buffer API token
- GitHub Actions secrets

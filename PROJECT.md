# NextGP Social — Project Details

## Overview

**Goal:** Grow NextGP downloads through consistent social presence without daily manual effort.

**Owner:** Chris Free  
**Assistant:** K2 (Clawdbot)

## Architecture

```
┌─────────────┐                  ┌──────────────┐
│     K2      │ ───────────────> │ Google Sheet │
│ (generates) │    (webhook)     │  (content)   │
└─────────────┘                  └──────┬───────┘
                                        │
                              Status = "Ready"
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  GitHub Actions  │
                              │  (every 15 min)  │
                              │                  │
                              │  Hash-based      │
                              │  deduplication   │
                              └────────┬─────────┘
                                       │
                                       ▼
                                 ┌─────────────┐
                                 │   Buffer    │
                                 │  (queue)    │
                                 └──────┬──────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ X / Mastodon    │
                              └─────────────────┘
```

## Setup

### 1. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google Sheets API
3. Create Service Account → Download JSON key
4. Share the [Google Sheet](https://docs.google.com/spreadsheets/d/10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw) with the service account email

### 2. Buffer Token

1. Go to [Buffer Developers](https://buffer.com/developers/apps)
2. Create app → Get Access Token

### 3. GitHub Secrets

Go to: Settings → Secrets and variables → Actions

| Secret | Value |
|--------|-------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Entire JSON key file contents |
| `BUFFER_ACCESS_TOKEN` | Your Buffer token |

### 4. Add the GitHub Actions Workflow

Create `.github/workflows/sync.yml` with the contents from `WORKFLOW.yml` in this repo.

(Can't push workflow files via API — must be done manually or via GitHub UI)

## Content Strategy

| Pillar | % | Examples |
|--------|---|----------|
| Race Weekend | 35% | Quali reactions, predictions |
| Breaking News | 25% | Driver news, team drama |
| App Value | 20% | Features, tips, widgets |
| F1 Culture | 15% | Memes, hot takes, history |
| Engagement | 5% | Polls, questions |

## Posting Schedule

- **X**: 1-3x daily
- **Mastodon**: 1x daily

## Adding Content

### Option 1: Direct to Sheet
Open sheet, add row, set Status = `Draft` or `Ready`

### Option 2: Webhook (for K2)
```bash
./scripts/add-content.sh "X" "Your tweet #F1" "2026-02-15" "09:00"
```

## Duplicate Prevention

The sync script creates an MD5 hash of `content + scheduled_time`. Hashes are stored as a GitHub artifact. Even if the sync runs multiple times, the same post will **never** be sent twice.

## Troubleshooting

**Posts not syncing?**
- Check Status is exactly `Ready`
- Check GitHub Actions logs
- Verify secrets are set

**Wrong Buffer profile?**
- Script auto-detects profiles by platform name
- Check Buffer has the platform connected

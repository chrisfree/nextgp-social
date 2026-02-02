# NextGP Social Media Automation

Automated content pipeline for growing NextGP's social presence.

## Overview

**Goal:** Grow downloads for NextGP (F1 iOS app) through consistent social media presence without requiring daily manual effort.

**Owner:** Chris Free
**Assistant:** K2 (Clawdbot)

## Architecture

```
┌─────────────┐     webhook      ┌──────────────┐
│     K2      │ ───────────────> │ Google Sheet │
│ (generates) │                  │  (content)   │
└─────────────┘                  └──────┬───────┘
                                        │
                              Status = "Ready"
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   Make.com  │
                                 │  (watches)  │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   Buffer    │
                                 │  (queue)    │
                                 └──────┬──────┘
                                        │
                              Chris reviews/approves
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ X / Mastodon /  │
                              │ Threads / Insta │
                              └─────────────────┘
```

## Accounts & Credentials

| Service | Email | Credentials Location |
|---------|-------|---------------------|
| Make.com | chrisfree@icloud.com | `credentials/make-com.txt` |
| Buffer | chrisfree@icloud.com | 1Password |
| Google Sheet | - | [Link](https://docs.google.com/spreadsheets/d/10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw/edit) |

## API Endpoints

### Make.com Webhook (Add Row to Sheet)
```bash
curl -X POST "https://hook.us2.make.com/w1ur8kwy4bnl2hgbwdg39mr6j04446at" \
  -H "Content-Type: application/json" \
  -H "x-make-apikey: nextgp-2026-k2so-webhook" \
  -d '{
    "platform": "X",
    "content": "Your post content here #F1",
    "media": "",
    "date": "2026-02-10",
    "time": "09:00",
    "status": "Draft",
    "notes": "Optional notes"
  }'
```

## Google Sheet Columns

| Column | Field | Description |
|--------|-------|-------------|
| A | Platform | X, Mastodon, Threads, Instagram |
| B | Content | Post text (with hashtags, emojis) |
| C | Media URL | Optional image/video URL |
| D | Scheduled Date | YYYY-MM-DD format |
| E | Scheduled Time | HH:MM format (24h) |
| F | Status | Draft → Ready → Sent |
| G | Notes | Internal notes (not posted) |

## Workflow

### Adding Content (K2)
1. Generate content batch based on F1 news, race calendar, content pillars
2. POST to Make.com webhook with `status: "Draft"`
3. Content appears in Google Sheet

### Approving Content (Chris)
1. Review posts in Google Sheet
2. Edit content as needed
3. Change Status to `Ready` for approved posts
4. Make.com automatically sends to Buffer

### Publishing (Buffer)
1. Posts appear in Buffer queue at scheduled time
2. Final review/edit in Buffer app
3. Buffer publishes automatically or manually

## Content Strategy

### Pillars
| Pillar | % | Examples |
|--------|---|----------|
| Race Weekend | 35% | Quali reactions, predictions, analysis |
| Breaking News | 25% | Driver news, regulations, team drama |
| App Value | 20% | NextGP features, widgets, tips |
| F1 Culture | 15% | Memes, hot takes, history |
| Engagement | 5% | Polls, questions |

### Posting Frequency
- **X**: 1-3x daily
- **Mastodon**: 1x daily
- **Threads**: 1x daily (when connected)
- **Instagram**: 3-5x/week (when connected)

### Race Weekend Ramp-Up
- Thursday: Preview posts
- Friday: FP1/FP2 reactions
- Saturday: Quali predictions + reactions
- Sunday: Race predictions + live commentary + post-race

## Social Profiles

| Platform | Handle | Status |
|----------|--------|--------|
| X (Twitter) | @NextGP_app | ✅ Connected |
| Mastodon | @nextGP@mastodon.xyz | ✅ Connected |
| Threads | @nextgp_app | ⏳ Pending |
| Instagram | @nextgp_app | ⏳ Pending |

## Make.com Scenarios

### 1. Add Content to Sheet
- **Trigger:** Webhook
- **Action:** Google Sheets - Add Row
- **Status:** ✅ Active

### 2. Sheet to Buffer
- **Trigger:** Google Sheets - Watch Rows (filter: Status = Ready)
- **Action:** Buffer - Create Post
- **Status:** ✅ Active

## Files in This Project

```
nextgp-social/
├── PROJECT.md          # This file
├── TASKS.md            # Ongoing tasks and improvements
├── README.md           # Quick reference
├── credentials/
│   ├── make-com.txt    # Make.com login
│   └── make-webhook.txt # Webhook details
├── content/
│   ├── ready-to-post.md
│   └── batch-001-2026-01-31.md
├── scripts/
│   └── add-content.sh  # Quick script to add posts
└── assets/             # Images, graphics
```

## Quick Commands

### Add a single post
```bash
./scripts/add-content.sh "X" "Your post here #F1" "2026-02-10" "09:00"
```

### Check sheet status
Open: https://docs.google.com/spreadsheets/d/10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw/edit

---

*Last updated: 2026-02-01*

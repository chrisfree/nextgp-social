# NextGP Social — Tasks

## Setup (Do Once)

- [ ] Create Google Service Account and share sheet
- [ ] Get Buffer API token
- [ ] Add GitHub secrets (`GOOGLE_SERVICE_ACCOUNT_KEY`, `BUFFER_ACCESS_TOKEN`)
- [ ] Copy `WORKFLOW.yml` to `.github/workflows/sync.yml`
- [ ] Disable Make.com scenario (it caused duplicates)
- [ ] Test end-to-end: add Ready row → wait 15 min → check Buffer

## Content Pipeline

- [ ] Generate weekly content batches (K2)
- [ ] Set up F1 news monitoring for breaking news
- [ ] Create image templates for visual posts
- [ ] Connect Threads to Buffer
- [ ] Connect Instagram to Buffer

## Future Improvements

- [ ] Add Slack/Telegram notification on sync errors
- [ ] Auto-archive old "Sent" posts after 30 days
- [ ] Track follower growth & engagement metrics
- [ ] A/B test posting times

## Completed ✅

- [x] Google Sheet content queue
- [x] Make.com webhook for adding content
- [x] Buffer integration
- [x] X/Twitter connected
- [x] Mastodon connected
- [x] GitHub Actions sync script (replaces Make.com)
- [x] Hash-based duplicate prevention

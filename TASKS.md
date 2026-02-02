# NextGP Social - Tasks & Improvements

## Immediate (This Week)

- [ ] **Turn on Make.com scenario continuously** - Currently only runs on "Run once"
- [ ] **Add "Update Status" module** - After Buffer receives post, update sheet Status to "Sent"
- [ ] **Connect Threads** - Add to Buffer, update Make.com profile mapping
- [ ] **Connect Instagram** - Add to Buffer, update Make.com profile mapping
- [ ] **Test Mastodon post** - Verify Mastodon profile works end-to-end
- [ ] **Save Make.com credentials to 1Password** - CLI auth was failing, do manually

## Content Pipeline

- [ ] **Create content generation script** - K2 runs daily/weekly to generate post ideas
- [ ] **Set up F1 news monitoring** - Watch RSS feeds, Twitter, Reddit for breaking news
- [ ] **Build race calendar integration** - Auto-generate preview/reaction posts around race weekends
- [ ] **Create image templates** - Canva or Figma templates for visual posts
- [ ] **Add media hosting** - Where to store images for posts (Imgur? Cloudinary?)

## Automation Improvements

- [ ] **Add error handling to Make.com** - Notify if Buffer post fails
- [ ] **Create "urgent post" workflow** - Skip Draft, go straight to Buffer for breaking news
- [ ] **Add analytics tracking** - UTM parameters on links to NextGP
- [ ] **Schedule K2 content generation** - Cron job to generate weekly content batches
- [ ] **Auto-archive old posts** - Move "Sent" posts to archive sheet after 30 days

## Content Ideas to Develop

- [ ] **Driver spotlight series** - Weekly feature on a driver
- [ ] **"Did you know" historical posts** - F1 history tidbits
- [ ] **App tip of the week** - Highlight NextGP features
- [ ] **Prediction posts** - Before quali/race, ask followers to predict
- [ ] **Meme templates** - Ready-to-use F1 meme formats
- [ ] **Thread templates** - Race preview, race recap, driver analysis

## Analytics & Growth

- [ ] **Track follower growth** - Baseline numbers, weekly tracking
- [ ] **Monitor engagement rates** - Which post types perform best
- [ ] **A/B test post times** - Find optimal posting schedule
- [ ] **Track app downloads** - Correlate social activity with downloads

## Technical Debt

- [ ] **Document Buffer profile IDs** - Currently hardcoded in Make.com
- [ ] **Create backup of Make.com scenarios** - Export JSON
- [ ] **Set up monitoring** - Alert if webhook stops working
- [ ] **Rate limiting** - Don't spam the webhook

## Completed ✅

- [x] Create Make.com account (2026-02-01)
- [x] Set up Google Sheet content queue (2026-02-01)
- [x] Create webhook to add rows (2026-02-01)
- [x] Connect Make.com to Buffer (2026-02-01)
- [x] Test end-to-end flow (2026-02-01)
- [x] Add initial content batch (2026-02-01)

---

*Track progress here. Check off as completed.*

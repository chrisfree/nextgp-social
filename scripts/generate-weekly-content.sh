#!/bin/bash
# Generate weekly content batch for NextGP
# This script is called by K2 to create a week's worth of posts
#
# Usage: ./generate-weekly-content.sh [start-date]
# Example: ./generate-weekly-content.sh 2026-02-10

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WEBHOOK="https://hook.us2.make.com/w1ur8kwy4bnl2hgbwdg39mr6j04446at"
APIKEY="nextgp-2026-k2so-webhook"

START_DATE="${1:-$(date -v+1d +%Y-%m-%d)}"

echo "🏎️ NextGP Weekly Content Generator"
echo "=================================="
echo "Generating content starting from: $START_DATE"
echo ""

# Function to add a post
add_post() {
  local platform="$1"
  local content="$2"
  local date="$3"
  local time="$4"
  local notes="$5"
  
  local content_escaped=$(echo "$content" | sed 's/"/\\"/g')
  
  curl -sL -X POST "$WEBHOOK" \
    -H "Content-Type: application/json" \
    -H "x-make-apikey: $APIKEY" \
    -d "{
      \"platform\": \"$platform\",
      \"content\": \"$content_escaped\",
      \"media\": \"\",
      \"date\": \"$date\",
      \"time\": \"$time\",
      \"status\": \"Draft\",
      \"notes\": \"$notes\"
    }" > /dev/null
  
  echo "  ✓ $platform: $date $time - ${content:0:50}..."
}

# Calculate dates for the week
day1="$START_DATE"
day2=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+1d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 1 day" +%Y-%m-%d)
day3=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+2d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 2 days" +%Y-%m-%d)
day4=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+3d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 3 days" +%Y-%m-%d)
day5=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+4d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 4 days" +%Y-%m-%d)
day6=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+5d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 5 days" +%Y-%m-%d)
day7=$(date -j -f "%Y-%m-%d" "$START_DATE" -v+6d +%Y-%m-%d 2>/dev/null || date -d "$START_DATE + 6 days" +%Y-%m-%d)

echo "📅 Week: $day1 to $day7"
echo ""
echo "Adding posts..."

# Content templates - K2 should customize these based on current F1 news
# This is a skeleton that should be populated with real content

add_post "X" "🏎️ [Morning engagement post - question or hot take about F1] #F1 #Formula1" "$day1" "09:00" "Engagement - morning"
add_post "X" "[Afternoon news or analysis post] #F1" "$day1" "14:00" "News/Analysis"
add_post "Mastodon" "[Cross-post variant for Mastodon - longer form ok] #F1 #Formula1" "$day2" "12:00" "Mastodon cross-post"
add_post "X" "💡 NextGP tip: [App feature highlight] Download link in bio! #F1 #NextGP" "$day3" "10:00" "App promo"
add_post "X" "[Hot take or prediction] 🔥 #F1" "$day4" "09:30" "Engagement - spicy"
add_post "X" "[Race/event related content] #F1 #Formula1" "$day5" "11:00" "Event content"
add_post "Mastodon" "[App feature deep dive for Mastodon] #F1 #NextGP" "$day6" "14:00" "App promo - Mastodon"
add_post "X" "[Weekend engagement - poll or question] #F1" "$day7" "10:00" "Weekend engagement"

echo ""
echo "✅ Weekly content batch added to sheet!"
echo ""
echo "Next steps:"
echo "  1. Review posts in Google Sheet"
echo "  2. Customize placeholder content with real F1 news"
echo "  3. Change Status to 'Ready' for approved posts"
echo ""
echo "Sheet: https://docs.google.com/spreadsheets/d/10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw/edit"

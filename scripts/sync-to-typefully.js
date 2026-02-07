/**
 * Typefully Sync Script
 * 
 * Reads posts from Google Sheets, sends to Typefully API, prevents duplicates.
 * 
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_KEY - JSON string of service account credentials
 *   TYPEFULLY_API_KEY - Your Typefully API key
 *   GOOGLE_SHEET_ID - (optional) defaults to NextGP sheet
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  sheetRange: 'A:G', // Columns: Platform, Content, Date, Time, Status, Notes, Source
  statusColumn: 4,   // E column (0-indexed = 4)
  sentHashesFile: path.join(__dirname, 'sent-hashes.json'),
  defaultSheetId: '10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw',
};

// Typefully API helper
class TypefullyAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.typefully.com';
    this.socialSetId = null;
  }

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Typefully API error ${response.status}: ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getSocialSets() {
    const result = await this.request('GET', '/v2/social-sets');
    return result.results || [];
  }

  async createDraft(socialSetId, text, scheduledAt, platform = 'x') {
    // Build platform config
    const platforms = {};
    
    if (platform.toLowerCase() === 'x' || platform.toLowerCase() === 'twitter') {
      platforms.x = {
        enabled: true,
        posts: [{ text }]
      };
    } else if (platform.toLowerCase() === 'mastodon') {
      platforms.mastodon = {
        enabled: true,
        posts: [{ text }]
      };
    } else if (platform.toLowerCase() === 'linkedin') {
      platforms.linkedin = {
        enabled: true,
        posts: [{ text }]
      };
    } else if (platform.toLowerCase() === 'threads') {
      platforms.threads = {
        enabled: true,
        posts: [{ text }]
      };
    } else if (platform.toLowerCase() === 'bluesky') {
      platforms.bluesky = {
        enabled: true,
        posts: [{ text }]
      };
    } else {
      // Default to X
      platforms.x = {
        enabled: true,
        posts: [{ text }]
      };
    }

    const body = {
      platforms,
      publish_at: scheduledAt, // ISO 8601 string
    };

    return this.request('POST', `/v2/social-sets/${socialSetId}/drafts`, body);
  }
}

// Google Sheets helper
class SheetsAPI {
  constructor(credentials, sheetId) {
    this.sheetId = sheetId;
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  async getRows() {
    const sheets = google.sheets({ version: 'v4', auth: await this.auth.getClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: CONFIG.sheetRange,
    });
    return response.data.values || [];
  }

  async updateCell(row, column, value) {
    const sheets = google.sheets({ version: 'v4', auth: await this.auth.getClient() });
    const columnLetter = String.fromCharCode(65 + column);
    const range = `${columnLetter}${row + 1}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  }
}

// Hash management
function loadSentHashes() {
  try {
    if (fs.existsSync(CONFIG.sentHashesFile)) {
      const data = fs.readFileSync(CONFIG.sentHashesFile, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.warn('Could not load sent hashes:', e.message);
  }
  return new Set();
}

function saveSentHashes(hashes) {
  fs.writeFileSync(CONFIG.sentHashesFile, JSON.stringify([...hashes], null, 2));
}

function hashPost(content, scheduledTime) {
  return crypto.createHash('md5').update(`${content}|${scheduledTime}`).digest('hex');
}

// Main sync function
async function sync() {
  console.log('🔄 Starting Typefully sync...\n');

  // Load environment variables
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID || CONFIG.defaultSheetId;
  const typefullyKey = process.env.TYPEFULLY_API_KEY;

  if (!serviceAccountKey || !typefullyKey) {
    console.error('❌ Missing required environment variables:');
    if (!serviceAccountKey) console.error('   - GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!typefullyKey) console.error('   - TYPEFULLY_API_KEY');
    console.error('\nOptional (has default):');
    console.error(`   - GOOGLE_SHEET_ID (using: ${sheetId})`);
    process.exit(1);
  }

  console.log(`📄 Sheet ID: ${sheetId}`);

  // Initialize APIs
  const credentials = JSON.parse(serviceAccountKey);
  const sheets = new SheetsAPI(credentials, sheetId);
  const typefully = new TypefullyAPI(typefullyKey);

  // Get Typefully social sets (accounts)
  console.log('📡 Fetching Typefully accounts...');
  const socialSets = await typefully.getSocialSets();
  
  if (socialSets.length === 0) {
    console.error('❌ No Typefully social sets found. Connect an account in Typefully first.');
    process.exit(1);
  }

  // Use the first social set (usually the primary account)
  const primarySet = socialSets[0];
  console.log(`   Using account: @${primarySet.username} (ID: ${primarySet.id})\n`);

  // Load sent hashes
  const sentHashes = loadSentHashes();
  console.log(`📋 Loaded ${sentHashes.size} previously sent post hashes\n`);

  // Get sheet data
  console.log('📊 Fetching Google Sheet data...');
  const rows = await sheets.getRows();
  console.log(`   Found ${rows.length - 1} rows (excluding header)\n`);

  // Process rows
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let duplicates = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 6) continue;

    const [platform, content, date, time, status] = row;

    // Only process "Ready" status
    if (status?.toLowerCase() !== 'ready') {
      continue;
    }

    processed++;

    // Validate required fields
    if (!platform || !content || !date || !time) {
      console.log(`⚠️  Row ${i + 1}: Missing required fields, skipping`);
      skipped++;
      continue;
    }

    // Parse flexible date formats (2/15/2026, 2026-02-15, etc.)
    let parsedDate;
    const dateStr = date.toString().trim();
    
    // Try M/D/YYYY format first (e.g., 2/15/2026)
    const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch;
      parsedDate = { year: parseInt(year), month: parseInt(month), day: parseInt(day) };
    } else {
      // Try YYYY-MM-DD format
      const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        parsedDate = { year: parseInt(year), month: parseInt(month), day: parseInt(day) };
      }
    }
    
    if (!parsedDate) {
      console.log(`⚠️  Row ${i + 1}: Can't parse date "${date}", skipping`);
      skipped++;
      continue;
    }
    
    // Parse flexible time formats (2:00:00 PM, 14:00, 2:00 PM, etc.)
    let hours = 0, minutes = 0;
    const timeStr = time.toString().trim();
    
    // Try 12-hour format with AM/PM (e.g., 2:00:00 PM, 2:00 PM)
    const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (time12Match) {
      hours = parseInt(time12Match[1]);
      minutes = parseInt(time12Match[2]);
      const isPM = time12Match[3].toUpperCase() === 'PM';
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      // Try 24-hour format (e.g., 14:00, 9:00)
      const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (time24Match) {
        hours = parseInt(time24Match[1]);
        minutes = parseInt(time24Match[2]);
      } else {
        console.log(`⚠️  Row ${i + 1}: Can't parse time "${time}", skipping`);
        skipped++;
        continue;
      }
    }
    
    // Build date string for Chicago timezone
    const pad = (n) => n.toString().padStart(2, '0');
    const chicagoDateStr = `${parsedDate.year}-${pad(parsedDate.month)}-${pad(parsedDate.day)}T${pad(hours)}:${pad(minutes)}:00`;
    
    // Handle CDT (Daylight Saving) - rough check: March to November
    const isDST = parsedDate.month >= 3 && parsedDate.month <= 11;
    const utcOffset = isDST ? '-05:00' : '-06:00';
    const scheduledDate = new Date(chicagoDateStr + utcOffset);
    
    if (isNaN(scheduledDate.getTime())) {
      console.log(`⚠️  Row ${i + 1}: Invalid date/time "${date} ${time}", skipping`);
      skipped++;
      continue;
    }
    
    // Convert to ISO 8601 UTC
    const scheduledAt = scheduledDate.toISOString();

    // Check for duplicate
    const hash = hashPost(content, scheduledAt);
    if (sentHashes.has(hash)) {
      console.log(`🔁 Row ${i + 1}: Duplicate detected, marking as Sent`);
      await sheets.updateCell(i, CONFIG.statusColumn, 'Sent');
      duplicates++;
      continue;
    }

    // Send to Typefully
    try {
      console.log(`📤 Row ${i + 1}: Sending "${content.substring(0, 50)}..." to ${platform}`);
      
      await typefully.createDraft(
        primarySet.id,
        content,
        scheduledAt,
        platform
      );

      // Mark as sent
      sentHashes.add(hash);
      await sheets.updateCell(i, CONFIG.statusColumn, 'Sent');
      sent++;
      
      console.log(`   ✅ Scheduled and marked as Sent`);
    } catch (error) {
      console.error(`   ❌ Failed to send: ${error.message}`);
      skipped++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save updated hashes
  saveSentHashes(sentHashes);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Sync Summary:');
  console.log(`   Processed: ${processed} "Ready" posts`);
  console.log(`   Sent: ${sent}`);
  console.log(`   Duplicates prevented: ${duplicates}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('='.repeat(50));
}

// Run
sync().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

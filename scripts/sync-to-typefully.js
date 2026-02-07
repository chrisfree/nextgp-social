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
  sheetRange: 'A:G', // Columns: Platform, Content, Media URL, Date, Time, Status, Notes
  statusColumn: 5,   // F column (0-indexed = 5)
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

    const [platform, content, mediaUrl, date, time, status] = row;

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

    // Normalize time format (6:00 → 06:00)
    let normalizedTime = time;
    if (time && time.match(/^\d:\d\d$/)) {
      normalizedTime = '0' + time; // 6:00 → 06:00
    }
    
    // Create scheduled timestamp (ISO 8601)
    const scheduledAt = `${date}T${normalizedTime}:00Z`;
    const scheduledDate = new Date(scheduledAt);
    
    if (isNaN(scheduledDate.getTime())) {
      console.log(`⚠️  Row ${i + 1}: Invalid date/time "${scheduledAt}" (original: ${date} ${time}), skipping`);
      skipped++;
      continue;
    }

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

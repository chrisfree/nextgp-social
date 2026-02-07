// NextGP Social Content Queue - Google Apps Script
// This script populates initial data AND creates a web endpoint for future posts

// Run this once to populate the initial content
function populateInitialContent() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Clear existing content
  sheet.clear();
  
  var data = [
    ["Platform", "Content", "Media URL", "Scheduled Date", "Scheduled Time", "Status", "Notes"],
    ["X", "🏎️ Pre-season testing is just around the corner. Who's your dark horse for 2026? Mine: Haas with that Toyota partnership is going to surprise people. #F1 #Formula1", "", "2026-02-03", "09:00", "Draft", "Engagement post - poll-style"],
    ["X", "The new tire regs are going to shake things up. Teams that nail the deg management early will have a HUGE advantage in the opening races. 📊 #F1", "", "2026-02-03", "14:00", "Draft", "Hot take"],
    ["X", "Widget tip: Add the NextGP race countdown widget to your home screen and never miss a session again ⏱️ Link in bio. #F1 #NextGP", "", "2026-02-04", "10:00", "Draft", "App promo"],
    ["Mastodon", "Pre-season testing approaches! I've been tracking the technical changes for 2026 - the new aero regs are fascinating. Which team do you think adapted best over the winter? #F1 #Formula1", "", "2026-02-04", "12:00", "Draft", "Cross-post variant"],
    ["X", "Hot take: Verstappen's dominance era is ending. The new regs are a reset button and at least 3 teams have a shot at the championship. 🔥 #F1", "", "2026-02-05", "09:30", "Draft", "Spicy engagement"],
    ["X", "Race weekends are better with NextGP. Live timing, push notifications, calendar sync. Built by F1 fans, for F1 fans. 📱 #F1 #Formula1", "", "2026-02-05", "15:00", "Draft", "App promo"],
    ["X", "The 2026 calendar is STACKED. 24 races. Which one are you most excited for? I'm hyped for Vegas after last year's drama 🎰 #F1", "", "2026-02-06", "11:00", "Draft", "Engagement"],
    ["Mastodon", "NextGP tip: You can set custom notifications for your favorite driver. Never miss when they're on track during practice sessions. Available on iOS. #F1 #NextGP", "", "2026-02-06", "14:00", "Draft", "App feature highlight"],
    ["X", "[BREAKING NEWS - REPLACE WITH ACTUAL NEWS]", "", "2026-02-07", "TBD", "Template", "Keep for breaking news"],
    ["X", "🧵 [RACE NAME] GP Preview - everything you need to know for this weekend's action... #F1", "", "2026-02-07", "TBD", "Template", "Thread starter template"]
  ];
  
  // Write all data at once
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, data[0].length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4285f4");
  headerRange.setFontColor("white");
  
  // Auto-resize columns
  for (var i = 1; i <= data[0].length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Set column B (Content) to a reasonable width
  sheet.setColumnWidth(2, 400);
  
  Logger.log("Initial content populated successfully!");
}

// Web App endpoint - receives POST requests with new content
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Handle single row or multiple rows
    var rows = data.rows || [data.row];
    
    rows.forEach(function(row) {
      // Ensure row has all columns (pad with empty strings if needed)
      while (row.length < 7) {
        row.push("");
      }
      sheet.appendRow(row);
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, added: rows.length}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Web App endpoint - receives GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({status: "NextGP Content Queue API is running"}))
    .setMimeType(ContentService.MimeType.JSON);
}

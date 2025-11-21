function fetchExternalAnalytics() {
  const GENERIC_TOKEN = 'GENERIC_BEARER_TOKEN_REDACTED_FOR_SECURITY'; // Replace with your Bearer Token
  const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  const DATA_SHEET = SPREADSHEET.getSheetByName('SummaryData'); // Summary data sheet
  const RAW_SHEET = SPREADSHEET.getSheetByName('RawEventData'); // Raw data sheet

  // === TIME CALCULATION (IST) ===
  // Assume we are fetching data for a timezone that uses IST offset (UTC + 5:30)
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const now = new Date();
  
  // Convert current time to IST
  const nowInIST = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + IST_OFFSET); // IST time

  // End time: 1 minute ago in IST, convert to UTC for API
  const endTimeInIST = new Date(nowInIST.getTime() - 60 * 1000); // 1 minute ago
  // Convert back to UTC for API (API usually expects UTC ISO strings)
  const isoEndTimeInUTC = new Date(endTimeInIST.getTime() - IST_OFFSET).toISOString().split('.')[0] + 'Z'; 

  // Start time: 7 days ago in IST, convert to UTC for API
  const startTimeInIST = new Date(nowInIST.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const isoStartTimeInUTC = new Date(startTimeInIST.getTime() - IST_OFFSET).toISOString().split('.')[0] + 'Z'; // Convert to UTC

  // === Get Target Entity ID ===
  const targetUsername = 'generic_target_user';
  const userApiUrl = `https://api.externalplatform.com/2/users/by/username/${targetUsername}`;
  const headers = { 'Authorization': 'Bearer ' + GENERIC_TOKEN };
  
  let userResponse = UrlFetchApp.fetch(userApiUrl, { headers, muteHttpExceptions: true });
  
  if (userResponse.getResponseCode() === 429) {
    fetchWithRetry(userApiUrl, headers); // Retry once
    userResponse = UrlFetchApp.fetch(userApiUrl, { headers, muteHttpExceptions: true });
  }

  const userData = JSON.parse(userResponse.getContentText());
  if (!userData.data) {
    Logger.log('Target entity not found: ' + JSON.stringify(userData));
    return;
  }

  const entityId = userData.data.id;

  // === Fetch all content events with pagination ===
  let allEvents = [];
  let nextToken = null;
  let apiUrlBase = `https://api.externalplatform.com/2/events/search/recent`
    + `?query=from:${entityId}`
    + `&start_time=${isoStartTimeInUTC}`
    + `&end_time=${isoEndTimeInUTC}`
    + `&event.fields=public_metrics,created_at` // Generic event fields
    + `&max_results=100`; // Max per page for efficiency

  // Loop through pages using the next_token to get all events
  do {
    let apiUrl = apiUrlBase;
    if (nextToken) {
      apiUrl += `&next_token=${nextToken}`;
    }

    Logger.log('API URL: ' + apiUrl);

    const response = fetchWithRetry(apiUrl, headers);
    if (!response || response.getResponseCode() !== 200) {
      Logger.log('Failed to fetch events: ' + response?.getContentText());
      return;
    }

    const data = JSON.parse(response.getContentText());
    Logger.log('Raw Response: ' + JSON.stringify(data));

    if (data.data) {
      allEvents = allEvents.concat(data.data); // Add fetched events to the list
    }

    nextToken = data.meta?.next_token; // Get the next_token for pagination
  } while (nextToken); // Continue if there's more data (next_token is available)

  if (allEvents.length === 0) {
    Logger.log('No events found in the time range.');
    // Update specific cells with 0 (retained cell references V16, W16, X16)
    if (DATA_SHEET) {
      DATA_SHEET.getRange('V16').setValue(0);
      DATA_SHEET.getRange('W16').setValue(0);
      DATA_SHEET.getRange('X16').setValue(0);
    }
    return;
  }

  // === Calculate Metrics ===
  const nowDate = new Date();
  const startOfWeek = getStartOfWeek(nowDate);  // Friday start
  const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

  let dailyMetric = 0;
  let wtdMetric = 0;
  let mtdMetric = 0;

  allEvents.forEach(event => {
    const eventDate = new Date(event.created_at);
    // Using a generic placeholder field "metric_value" for the actual count
    const metricValue = event.public_metrics.metric_value || 0; 

    // Store raw data in the 'RawEventData' sheet
    if (RAW_SHEET) {
      RAW_SHEET.appendRow([event.id, event.created_at, metricValue]); // Storing ID, Created Date, Metric Value
    }

    // Daily: same date
    if (eventDate.toDateString() === nowDate.toDateString()) {
      dailyMetric += metricValue;
    }

    // WTD: from start of week (Friday)
    if (eventDate >= startOfWeek) {
      wtdMetric += metricValue;
    }

    // MTD: from 1st of month
    if (eventDate >= startOfMonth) {
      mtdMetric += metricValue;
    }
  });

  // === Update Sheet ===
  if (DATA_SHEET) {
    DATA_SHEET.getRange('V16').setValue(dailyMetric);
    DATA_SHEET.getRange('W16').setValue(wtdMetric);
    DATA_SHEET.getRange('X16').setValue(mtdMetric);

    // Set the current timestamp in cell U16 (IST Time)
    DATA_SHEET.getRange('U16').setValue(nowInIST);  // Timestamp for when the script was run in IST
  }

  Logger.log(`Daily: ${dailyMetric}, WTD: ${wtdMetric}, MTD: ${mtdMetric}`);
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 5 = Fri
  const diff = (day - 5 + 7) % 7; // Corrected formula for week start on Friday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fetchWithRetry(url, headers) {
  const maxRetries = 3;
  let delay = 1000;

  for (let i = 0; i <= maxRetries; i++) {
    const response = UrlFetchApp.fetch(url, { headers, muteHttpExceptions: true });
    const code = response.getResponseCode();

    if (code === 200) return response;

    if (code === 429) {
      // Placeholder for rate-limit header handling (header name is platform specific)
      const resetHeader = response.getHeaders()['x-rate-limit-reset'] || response.getHeaders()['X-Rate-Limit-Reset'];
      
      // Fallback or calculated wait time
      let waitMs = delay; 
      if (resetHeader) {
        // Assuming resetHeader is a Unix timestamp in seconds
        waitMs = (Number(resetHeader) * 1000) - Date.now();
      }

      Logger.log(`Rate limited. Waiting ${waitMs/1000}s...`);
      Utilities.sleep(Math.max(waitMs, 1000));
      delay *= 2;
    } else {
      Logger.log(`HTTP ${code}: ${response.getContentText()}`);
      break;
    }
  }
  return null;
}

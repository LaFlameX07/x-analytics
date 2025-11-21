# x-analytics
# 📊 Twitter Analytics Fetcher (Google Apps Script)

This project fetches **7-day Twitter/X analytics** (Tweet impressions) using the Twitter API v2 and automatically stores them inside a **Google Sheets analytics workspace**.  
It is built for automated **daily, WTD, and MTD reporting** without manual effort.

All sensitive values (sheet names, tokens, URLs) are stored using **template variables**, allowing this codebase to remain clean and reusable.

---

## 🚀 Motivation

Collecting social media analytics manually is error-prone and time-consuming.  
Most teams rely on screenshots or third-party dashboards, which are either:

- slow  
- not automated  
- hard to export  
- or require paid tools  

This script completely automates the workflow using **Google Apps Script + Twitter API**, giving you:

- Zero manual downloads  
- Persistent raw data storage  
- Auto-refreshed insights (Daily, WTD, MTD)  
- Data ready for dashboards (Looker, Data Studio, Excel, Sheets)  

---

## 👥 Who Is This Useful For?

| User | How It Helps |
|------|--------------|
| Social media teams | Automatic analytics collection every day |
| Marketing analysts | Ready-to-use raw data + summaries |
| Founders / indie builders | Track performance of product updates & announcements |
| Data engineers | Lightweight pipeline without servers |
| Reporting automation | Integrate into dashboards or scheduled exports |

---

## 🧩 What This Script Does

✔ Fetches recent tweets via **Twitter API v2** ✔ Correctly calculates **IST-based time windows** ✔ Fetches **all tweets from the last 7 days** using pagination (`next_token`)  
✔ Extracts **impression counts** ✔ Writes raw analytics into a dedicated sheet (`RawTweetsData`)  
✔ Updates daily/WTD/MTD totals into your main sheet  
✔ Handles rate-limit errors with retry logic  
✔ Stores a timestamp for every fetch  

---

## 📁 Data Flow & Sheet Architecture

The script uses two core sheets inside Google Sheets:

### **1️⃣ `{{MAIN_ANALYTICS_SHEET}}`** This sheet holds the **metrics summary** that updates on every run.

| Column | Description |
|--------|-------------|
| U16 | Last updated timestamp (IST) |
| V16 | Daily impressions |
| W16 | Week-to-date impressions |
| X16 | Month-to-date impressions |

### **2️⃣ `{{RAW_TWEETS_SHEET}}`** Every time the script fetches tweets, it appends raw events:

| Column | Meaning |
|--------|---------|
| Tweet ID | Unique tweet identifier |
| Created At | Tweet creation timestamp |
| Impressions | Impression count returned by API |

This creates a complete historical log of impressions for all tweets fetched.

---

## 🛠 Tech Stack

| Component | Technology |
|----------|------------|
| Backend | Google Apps Script |
| Data Storage | Google Sheets |
| API | Twitter API v2 (recent search endpoint) |
| Scheduler | Apps Script Triggers |
| Authentication | OAuth2 Bearer Token |

---

## ⚙ Setup Instructions

### **1️⃣ Replace Template Variables**

| Variable | Replace With |
|----------|--------------|
| `{{BEARER_TOKEN}}` | Your Twitter/X API bearer token |
| `{{MAIN_ANALYTICS_SHEET}}` | Sheet tab name where metrics go |
| `{{RAW_TWEETS_SHEET}}` | Sheet tab for storing raw tweet data |
| `{{TWITTER_USERNAME}}` | Username to fetch tweets from |

### **2️⃣ Paste Script Into Google Apps Script**

Go to:  
`Extensions → Apps Script → New Script`

Paste your project code.

### **3️⃣ Add the API Token**

Go to:  
`Project Settings → Script Properties`

Add:

```ini
BEARER_TOKEN = your_token_here
```

### **4️⃣ Add Automatic Scheduling**

In Apps Script:

`Triggers → Add Trigger → choose fetch function → daily / hourly`

---

## 🧠 How the Script Fetches Data

### **Step-by-Step Flow**

1. Convert current time into **IST** 2. Determine time windows:
   - END: 1 minute ago  
   - START: 7 days ago  
3. Convert IST → UTC (Twitter API requirement)  
4. Fetch Twitter user ID  
5. Call:  
   ```bash
   /2/tweets/search/recent?query=from:<USER_ID>
   ```
6. Use `next_token` to request all pages  
7. For each tweet:
   - extract impression count  
   - append raw data row  
   - categorize into Daily / WTD / MTD buckets  
8. Write final totals into your analytics sheet  
9. Update the timestamp  
10. Log API response for debugging

---

---

## 📦 Folder Structure (Recommended)

```text
/twitter-analytics-fetcher
│── README.md
│── src/
│   └── fetchTweets.gs
│── sheets/
│   ├── main_sheet_template.csv
│   └── raw_sheet_template.csv
│── .gitignore
```

---

## 🏁 Conclusion

This project gives you a **serverless, cost-free, automated analytics pipeline** for Twitter/X that:

- Eliminates manual data downloads  
- Stores complete raw analytics for long-term insights  
- Generates metrics for dashboards automatically  
- Works entirely in Google Sheets  

It’s a perfect lightweight solution for marketing teams, analysts, and automation-first workflows.

---

## 💬 Need a more advanced version?

I can generate:

- A Looker/Data Studio dashboard  
- A version that tracks likes, replies, retweets  
- A script that exports CSV via email  
- A backend version using Cloud Run  

Just let me know!

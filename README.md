# MIVA Charity & Volunteering Club Birthday Bot

A Telegram bot for the **MIVA Charity & Volunteering Club** that automatically celebrates members on their birthdays.

The bot reads member information from a Google Form response spreadsheet, checks for birthdays, retrieves profile photos from Google Drive, and posts a birthday announcement with the member's photo in the club's main Telegram group.

## Features

- Automatically detects members whose birthday is today
- Reads member information directly from Google Sheets
- Retrieves member profile photos from Google Drive
- Compresses profile photos before sending them to Telegram
- Sends the photo and birthday message as one Telegram message
- Tags members using their Telegram username
- Only announces members who have provided birthday/photo consent
- Handles duplicate form submissions
- Prevents duplicate birthday announcements
- Supports Telegram commands
- Provides an HTTP endpoint for scheduled birthday checks
- Designed to work with an external cron service such as cron-job.org
- Can be deployed as a Node.js web service

## Tech Stack

- **Node.js**
- **JavaScript**
- **Google Sheets API**
- **Google Drive API**
- **Telegram Bot API**
- **Express**
- **Sharp**
- **cron-job.org**
- **Render**

# Environment Variables

The application requires the following environment variables:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_ID=
GOOGLE_SHEET_ID=
GOOGLE_CREDENTIALS=
CRON_SECRET=
```

# Local Development

Install dependencies:

```bash
npm install
```

Start the bot:

```bash
node bot.js
```

The bot should report:

```text
Starting MIVA Birthday Bot...
HTTP server running on port 3000
Telegram bot polling started.
```

---

# Telegram Commands

## `/start`

Returns a welcome message.

```text
/start
```

## `/whoami`

Displays the Telegram user's ID and username.

```text
/whoami
```

Example:

```text
Your Telegram ID is: 123456789
Your username is: @h3h1m
```

This is useful when collecting or verifying Telegram usernames.

## `/chatid`

Returns the ID of the current Telegram chat.

```text
/chatid
```

## `/testbirthday`

Sends a test message to the configured main club group.

```text
/testbirthday
```

## `/checkbirthdays`

Manually checks the Google Sheet and sends any pending birthday announcements.

```text
/checkbirthdays
```

## License

This project was created for the **MIVA Charity & Volunteering Club**.

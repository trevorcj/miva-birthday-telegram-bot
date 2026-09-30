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
TELEGRAM_TEST_CHAT_ID=
GOOGLE_SHEET_ID=
GOOGLE_CREDENTIALS=
CRON_SECRET=
ADMIN_TELEGRAM_USER_IDS=
ALLOW_MANUAL_PRODUCTION_BIRTHDAY_CHECKS=false
```

`ADMIN_TELEGRAM_USER_IDS` is a comma-separated list of numeric Telegram user
IDs allowed to run operational commands, for example `123456789,987654321`.
Use a numeric ID rather than a username because usernames can be changed.

`TELEGRAM_TEST_CHAT_ID` must be a separate test chat, never the production
group. `/testbirthday` sends only to this chat. Leave
`ALLOW_MANUAL_PRODUCTION_BIRTHDAY_CHECKS` set to `false` unless an authorized
administrator deliberately needs `/checkbirthdays` to trigger the live
birthday workflow from a private chat.

## Cron configuration

The birthday endpoint accepts only an authorization header, not a URL query
secret:

```text
GET /check-birthdays
Authorization: Bearer <CRON_SECRET>
```

Update the external scheduler to send this header before deploying this
version. Do not include the secret in the scheduled URL.

`GET /healthz` returns the current check status and the most recent completed
birthday check. Configure monitoring to alert if it reports a failed check or
if the most recent completion is older than the expected schedule.

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

Returns a welcome message in a private chat with the bot. Commands issued in a
group are ignored so the bot does not add operational chatter to the live group.

```text
/start
```

## `/whoami`

Displays the Telegram user's numeric ID and username in a private chat. Send
this command directly to the bot—not in the school group—to obtain the ID for
`ADMIN_TELEGRAM_USER_IDS`.

```text
/whoami
```

Example:

```text
Your Telegram ID is: 123456789
Your username is: @h3h1m
```

This is useful when collecting an administrator's Telegram ID.

## `/chatid`

Requires an administrator. It returns the ID in a private chat or a
non-production test group, but is silently ignored in the production school
group. This makes it safe to run in the separate test group when obtaining
`TELEGRAM_TEST_CHAT_ID`.

```text
/chatid
```

## `/testbirthday`

Requires an administrator's private chat with the bot and sends a test message
only to `TELEGRAM_TEST_CHAT_ID`.

```text
/testbirthday
```

## `/checkbirthdays`

Requires an administrator's private chat with the bot. It is disabled by
default and can only be enabled with
`ALLOW_MANUAL_PRODUCTION_BIRTHDAY_CHECKS=true`.

```text
/checkbirthdays
```

## License

This project was created for the **MIVA Charity & Volunteering Club**.

require("dotenv").config();

const { google } = require("googleapis");

const DELIVERY_ATTEMPTS_SHEET = "Birthday Delivery Attempts";

function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }

  return new google.auth.GoogleAuth({
    ...(credentials
      ? {
          credentials,
        }
      : {
          keyFile: "credentials.json",
        }),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getGoogleAuth();

  return google.sheets({
    version: "v4",
    auth,
  });
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function hasBeenAnnounced(member) {
  const sheets = await getSheetsClient();

  const birthdayDate = getTodayString();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Birthday Announcements!A:E",
  });

  const rows = response.data.values || [];

  const announcements = rows.slice(1);

  return announcements.some((row) => {
    const recordedDate = row[0]?.trim();
    const recordedEmail = row[1]?.trim().toLowerCase();

    return (
      recordedDate === birthdayDate &&
      recordedEmail === member.email.toLowerCase()
    );
  });
}

async function markAsAnnounced(member) {
  const sheets = await getSheetsClient();

  const birthdayDate = getTodayString();

  const sentAt = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,

    range: "Birthday Announcements!A:E",

    valueInputOption: "USER_ENTERED",

    requestBody: {
      values: [
        [
          birthdayDate,
          member.email,
          member.name,
          member.telegramUsername || "",
          sentAt,
        ],
      ],
    },
  });

  console.log(`Announcement recorded for ${member.name}.`);
}

async function ensureDeliveryAttemptsSheet(sheets) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: "sheets.properties",
  });

  const exists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === DELIVERY_ATTEMPTS_SHEET,
  );

  if (exists) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: DELIVERY_ATTEMPTS_SHEET } } },
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${DELIVERY_ATTEMPTS_SHEET}!A1:H1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Date",
          "Email",
          "Name",
          "Status",
          "Phase",
          "Attempted At",
          "Telegram Message ID",
          "Error",
        ],
      ],
    },
  });
}

async function recordDeliveryAttempt(member, status, phase, details = {}) {
  const sheets = await getSheetsClient();

  await ensureDeliveryAttemptsSheet(sheets);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${DELIVERY_ATTEMPTS_SHEET}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          getTodayString(),
          member.email,
          member.name,
          status,
          phase,
          new Date().toISOString(),
          details.telegramMessageId || "",
          details.error || "",
        ],
      ],
    },
  });
}

module.exports = {
  hasBeenAnnounced,
  markAsAnnounced,
  recordDeliveryAttempt,
};

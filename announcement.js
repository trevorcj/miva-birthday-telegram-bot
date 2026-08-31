require("dotenv").config();

const { google } = require("googleapis");

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

module.exports = {
  hasBeenAnnounced,
  markAsAnnounced,
};

require("dotenv").config();

const { google } = require("googleapis");

function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    credentials = undefined;
  }

  return new google.auth.GoogleAuth({
    ...(credentials
      ? {
          credentials,
        }
      : {
          keyFile: "credentials.json",
        }),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function getMembers() {
  const auth = getGoogleAuth();

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Form Responses 1!A:Z",
  });

  const rows = response.data.values;

  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());

  const getColumnIndex = (columnName) => {
    return headers.indexOf(columnName.toLowerCase());
  };

  const fullNameIndex = getColumnIndex("full name");
  const emailIndex = getColumnIndex("email address");
  const dateOfBirthIndex = getColumnIndex("date of birth");
  const profilePictureIndex = getColumnIndex("profile picture");
  const consentIndex = getColumnIndex("consent & permission");
  const telegramUsernameIndex = getColumnIndex("telegram username");

  const members = rows
    .slice(1)
    .map((row, index) => {
      return {
        rowNumber: index + 2,

        name: fullNameIndex !== -1 ? row[fullNameIndex]?.trim() || "" : "",

        email:
          emailIndex !== -1 ? row[emailIndex]?.trim().toLowerCase() || "" : "",

        dateOfBirth:
          dateOfBirthIndex !== -1 ? row[dateOfBirthIndex]?.trim() || "" : "",

        profilePicture:
          profilePictureIndex !== -1
            ? row[profilePictureIndex]?.trim() || ""
            : "",

        consent: consentIndex !== -1 ? row[consentIndex]?.trim() || "" : "",

        telegramUsername:
          telegramUsernameIndex !== -1
            ? row[telegramUsernameIndex]?.trim().replace(/^@/, "") || ""
            : "",
      };
    })
    .filter((member) => member.email);

  // remove duplicate submissions
  const uniqueMembers = new Map();

  for (const member of members) {
    uniqueMembers.set(member.email, member);
  }

  return Array.from(uniqueMembers.values());
}

module.exports = {
  getMembers,
};

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
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

async function getDriveClient() {
  const auth = getGoogleAuth();

  return google.drive({
    version: "v3",
    auth,
  });
}

function extractDriveFileId(url) {
  if (!url) {
    return null;
  }

  const match = url.match(/[?&]id=([^&]+)/);

  if (match) {
    return match[1];
  }

  const pathMatch = url.match(/\/file\/d\/([^/]+)/);

  return pathMatch ? pathMatch[1] : null;
}

async function getDriveFileInfo(url) {
  const fileId = extractDriveFileId(url);

  if (!fileId) {
    throw new Error("Could not extract Google Drive file ID.");
  }

  const drive = await getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size,webViewLink",
  });

  return response.data;
}

async function downloadDriveImage(url) {
  const fileId = extractDriveFileId(url);

  if (!fileId) {
    throw new Error("Could not extract Google Drive file ID.");
  }

  const drive = await getDriveClient();

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "arraybuffer",
    },
  );

  return Buffer.from(response.data);
}

module.exports = {
  extractDriveFileId,
  getDriveFileInfo,
  downloadDriveImage,
};

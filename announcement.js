const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "sent-birthdays.json");

function loadSentBirthdays() {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const data = fs.readFileSync(filePath, "utf8");

  return JSON.parse(data);
}

function saveSentBirthdays(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createBirthdayKey(member) {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}:${member.email}`;
}

function hasBeenAnnounced(member) {
  const sentBirthdays = loadSentBirthdays();

  const key = createBirthdayKey(member);

  return Boolean(sentBirthdays[key]);
}

function markAsAnnounced(member) {
  const sentBirthdays = loadSentBirthdays();

  const key = createBirthdayKey(member);

  sentBirthdays[key] = true;

  saveSentBirthdays(sentBirthdays);
}

module.exports = {
  hasBeenAnnounced,
  markAsAnnounced,
};

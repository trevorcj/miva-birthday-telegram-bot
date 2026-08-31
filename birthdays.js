function parseDateOfBirth(dateString) {
  const parts = dateString.split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  return {
    day,
    month,
    year,
  };
}

function hasBirthdayConsent(member) {
  return member.consent.toLowerCase().includes("i consent");
}

function getTodaysBirthdays(members) {
  const today = new Date();

  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;

  return members.filter((member) => {
    const birthday = parseDateOfBirth(member.dateOfBirth);

    if (!birthday) {
      return false;
    }

    if (!hasBirthdayConsent(member)) {
      return false;
    }

    return birthday.day === currentDay && birthday.month === currentMonth;
  });
}

module.exports = {
  getTodaysBirthdays,
  hasBirthdayConsent,
};

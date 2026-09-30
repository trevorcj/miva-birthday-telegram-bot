function getAdminUserIds(value = process.env.ADMIN_TELEGRAM_USER_IDS) {
  return new Set(
    (value || "")
      .split(",")
      .map((userId) => userId.trim())
      .filter((userId) => /^\d+$/.test(userId)),
  );
}

function isAdminUser(userId, adminUserIds = getAdminUserIds()) {
  return Boolean(userId) && adminUserIds.has(String(userId));
}

function isPrivateChat(chat) {
  return chat?.type === "private";
}

function isProductionChat(chatId, productionGroupId) {
  return String(chatId) === String(productionGroupId);
}

function isEnabled(value) {
  return value === "true";
}

function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);

  return match ? match[1] : null;
}

module.exports = {
  getAdminUserIds,
  getBearerToken,
  isAdminUser,
  isEnabled,
  isPrivateChat,
  isProductionChat,
};

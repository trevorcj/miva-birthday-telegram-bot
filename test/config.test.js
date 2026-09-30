const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAdminUserIds,
  getBearerToken,
  isAdminUser,
  isEnabled,
  isPrivateChat,
} = require("../config");

test("admin user IDs accept numeric IDs and ignore invalid entries", () => {
  const admins = getAdminUserIds("123, 456, username, -789, 123");

  assert.deepEqual([...admins], ["123", "456"]);
  assert.equal(isAdminUser(123, admins), true);
  assert.equal(isAdminUser("456", admins), true);
  assert.equal(isAdminUser(789, admins), false);
});

test("only an exact true value enables production-only actions", () => {
  assert.equal(isEnabled("true"), true);
  assert.equal(isEnabled("TRUE"), false);
  assert.equal(isEnabled("false"), false);
  assert.equal(isEnabled(undefined), false);
});

test("only private chats are valid for operational commands", () => {
  assert.equal(isPrivateChat({ type: "private" }), true);
  assert.equal(isPrivateChat({ type: "group" }), false);
  assert.equal(isPrivateChat(undefined), false);
});

test("authorization header accepts a bearer token only", () => {
  assert.equal(getBearerToken("Bearer cron-secret"), "cron-secret");
  assert.equal(getBearerToken("bearer cron-secret"), "cron-secret");
  assert.equal(getBearerToken("cron-secret"), null);
  assert.equal(getBearerToken(undefined), null);
});

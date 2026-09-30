const test = require("node:test");
const assert = require("node:assert/strict");

const { isProductionChat } = require("../config");

test("a chat-ID response is never sent to the production group", () => {
  assert.equal(isProductionChat(-100123, -100123), true);
});

test("an administrator can obtain a non-production test chat ID", () => {
  assert.equal(isProductionChat(-100456, -100123), false);
});

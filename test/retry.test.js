const test = require("node:test");
const assert = require("node:assert/strict");

const { isRetryableError, retryOperation } = require("../retry");

test("recognizes temporary network and server failures as retryable", () => {
  assert.equal(isRetryableError({ code: "ETIMEDOUT" }), true);
  assert.equal(isRetryableError({ response: { status: 503 } }), true);
  assert.equal(isRetryableError({ response: { status: 400 } }), false);
});

test("retries a temporary failure and returns the successful result", async () => {
  let calls = 0;
  const result = await retryOperation(
    "test operation",
    async () => {
      calls += 1;
      if (calls === 1) throw { code: "ETIMEDOUT" };
      return "done";
    },
    { attempts: 2, delayMs: 1 },
  );

  assert.equal(result, "done");
  assert.equal(calls, 2);
});

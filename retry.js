const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

function isRetryableError(error) {
  const status = error?.response?.status || error?.code;

  return (
    RETRYABLE_ERROR_CODES.has(error?.code) ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function retryOperation(label, operation, options = {}) {
  const attempts = options.attempts || 3;
  const delayMs = options.delayMs || 500;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt === attempts || !isRetryableError(error)) {
        throw error;
      }

      console.warn(
        `${label} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms.`,
      );
      await sleep(delayMs * attempt);
    }
  }
}

module.exports = { isRetryableError, retryOperation };

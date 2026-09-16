const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEVELOPMENT_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  resolveApiBaseUrl,
} = require("../api-config");

test("desktop development and packaged builds resolve the intended shared API", () => {
  assert.equal(resolveApiBaseUrl({ isPackaged: false }), DEVELOPMENT_API_BASE_URL);
  assert.equal(resolveApiBaseUrl({ isPackaged: true }), PRODUCTION_API_BASE_URL);
});

test("desktop API override is normalized for custom builds", () => {
  assert.equal(
    resolveApiBaseUrl({ isPackaged: true, override: " https://staging.example.com/api/ " }),
    "https://staging.example.com/api"
  );
});

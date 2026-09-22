const test = require("node:test");
const assert = require("node:assert/strict");

const { getFrontendUrl, validateProductionConfig } = require("../src/config/productionConfig");

const productionEnv = (overrides = {}) => ({
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://example.invalid/app",
  JWT_SECRET: "a-production-value-with-more-than-32-random-characters",
  FRONTEND_URL: "https://app.example.com/",
  ...overrides,
});

test("development uses the local dashboard URL by default", () => {
  assert.equal(getFrontendUrl({ NODE_ENV: "development" }), "http://localhost:5173");
});

test("Render public URL is used when FRONTEND_URL is not configured", () => {
  const env = productionEnv({ FRONTEND_URL: "", RENDER_EXTERNAL_URL: "https://handdy-workspace.onrender.com/" });
  assert.equal(getFrontendUrl(env), "https://handdy-workspace.onrender.com");
  assert.doesNotThrow(() => validateProductionConfig(env));
});

test("production rejects missing or unsafe frontend URLs", () => {
  assert.throws(
    () => validateProductionConfig(productionEnv({ FRONTEND_URL: "", RENDER_EXTERNAL_URL: "" })),
    /FRONTEND_URL/
  );
  assert.throws(
    () => validateProductionConfig(productionEnv({ FRONTEND_URL: "http://localhost:5173" })),
    /HTTPS/
  );
});

test("production rejects placeholder JWT secrets", () => {
  assert.throws(
    () => validateProductionConfig(productionEnv({ JWT_SECRET: "replace-with-a-random-secret-of-at-least-32-characters" })),
    /JWT_SECRET/
  );
});

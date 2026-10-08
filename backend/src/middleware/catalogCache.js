const { dependencyRevision, digest } = require("../services/readRevisions");
const entries = new Map();
const MAX_ENTRIES = 64;
const MAX_BYTES = 8 * 1024 * 1024;
let bytes = 0;

function remove(key) {
  bytes -= entries.get(key)?.bytes || 0;
  entries.delete(key);
}

// Must run AFTER authentication/authorization. Private results stay scoped.
function catalogCache(models, { shared = false } = {}) {
  return async (req, res, next) => {
    try {
      const references = await dependencyRevision(models);
      const key = digest([req.baseUrl, req.path, req.query,
        shared ? null : String(req.user._id), req.user.role, String(req.user.team || ""),
        String(req.user.teamLead || ""), req.user.permissions || [], references]);
      const hit = entries.get(key);
      if (hit && hit.expiresAt > Date.now()) return res.status(200).json(JSON.parse(hit.body));
      if (hit) remove(key);
      const json = res.json;
      res.json = function (body) {
        if (res.statusCode === 200 && body?.success === true) {
          const serialized = JSON.stringify(body);
          const size = Buffer.byteLength(serialized);
          if (size <= MAX_BYTES) {
            remove(key);
            while (entries.size >= MAX_ENTRIES || bytes + size > MAX_BYTES) remove(entries.keys().next().value);
            entries.set(key, { body: serialized, bytes: size, expiresAt: Date.now() + 60_000 });
            bytes += size;
          }
        }
        return json.call(this, body);
      };
      next();
    } catch {
      // Cache/revision failure must never prevent normal application loading.
      next();
    }
  };
}

module.exports = catalogCache;

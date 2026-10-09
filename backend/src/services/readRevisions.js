const crypto = require("node:crypto");
const cached = new Map();
const generations = new Map();
const inFlight = new Map();
const TTL_MS = 5_000;

function invalidate(modelName) {
  cached.delete(modelName);
  generations.set(modelName, (generations.get(modelName) || 0) + 1);
}

function readRevisionPlugin(schema) {
  // The checksum needs only updatedAt. Give its recurring aggregation an
  // index to traverse, instead of scanning the catalog documents themselves.
  schema.index({ updatedAt: 1 });
  for (const operation of ["save", "insertMany", "updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete", "replaceOne", "findOneAndReplace", "bulkWrite"]) {
    schema.post(operation, function () {
      const modelName = this.constructor.modelName || this.model?.modelName || this.modelName;
      if (modelName) invalidate(modelName);
    });
  }
}

async function collectionRevision(Model) {
  const name = Model.modelName;
  const hit = cached.get(name);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const generation = generations.get(name) || 0;
  const pending = inFlight.get(name);
  if (pending?.generation === generation) return pending.promise;
  const promise = (async () => {
    const rows = await Model.aggregate([{ $group: {
      _id: null,
      count: { $sum: 1 },
      latest: { $max: "$updatedAt" },
      total: { $sum: { $convert: { input: "$updatedAt", to: "long", onError: 0, onNull: 0 } } },
    } }]).hint({ updatedAt: 1 });
    const value = [name, rows[0]?.count || 0, rows[0]?.latest || null, rows[0]?.total || 0, generation];
    if ((generations.get(name) || 0) === generation) cached.set(name, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  })();
  inFlight.set(name, { generation, promise });
  try { return await promise; } finally {
    if (inFlight.get(name)?.promise === promise) inFlight.delete(name);
  }
}

const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function dependencyRevision(models) {
  return digest(await Promise.all(models.map(collectionRevision)));
}

module.exports = { dependencyRevision, digest, invalidate, readRevisionPlugin };

// Read-only audit. Use the native client so loading schemas cannot build or
// synchronize indexes on the database being inspected.
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const modelNames = ["Employee", "Project", "Task", "Client", "Team", "Attendance", "TaskTimeLog"];
const sameKeys = (left, right) => JSON.stringify(Object.entries(left)) === JSON.stringify(Object.entries(right));

function inspectIndexes(expected, actual) {
  return expected.map((keys) => {
    const matches = actual.filter((index) => sameKeys(index.key, keys));
    const usable = matches.filter((index) => !index.hidden && !index.sparse && !index.partialFilterExpression);
    return { keys, present: usable.length > 0, matches: matches.map((index) => index.name),
      duplicateDefinitions: matches.length > 1 };
  });
}

async function verify() {
  dotenv.config({ quiet: true });
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000, socketTimeoutMS: 10_000,
    maxPoolSize: 1, retryWrites: false, appName: "CRM-read-only-index-audit",
  });
  try {
    await client.connect();
    const db = client.db();
    const report = [];
    for (const name of modelNames) {
      const Model = require(`../src/models/${name}`);
      const expected = Model.schema.indexes().filter(([keys]) => Object.hasOwn(keys, "updatedAt")).map(([keys]) => keys);
      let actual;
      try { actual = await db.collection(Model.collection.name).listIndexes({ maxTimeMS: 10_000 }).toArray(); }
      catch (error) { if (error.code === 26) actual = []; else throw error; }
      report.push({ collection: Model.collection.name, checks: inspectIndexes(expected, actual),
        existingTimestampIndexes: actual.filter((index) => Object.hasOwn(index.key, "updatedAt"))
          .map((index) => ({ name: index.name, keys: index.key, hidden: Boolean(index.hidden), sparse: Boolean(index.sparse), partial: Boolean(index.partialFilterExpression) })) });
    }
    console.log(JSON.stringify({ readOnly: true, report }, null, 2));
    return report.every((item) => item.checks.every((check) => check.present));
  } finally { await client.close(); }
}

if (require.main === module) {
  verify().then((complete) => { process.exitCode = complete ? 0 : 2; }).catch((error) => {
    // Driver error messages may contain connection details. Keep credentials
    // and connection strings out of console output and committed reports.
    console.error(`Index audit could not complete (${error.name || "Error"}${error.code ? `, code ${error.code}` : ""}). Check connectivity, Atlas IP access and read permissions.`);
    process.exitCode = 1;
  });
}

module.exports = { inspectIndexes, verify };

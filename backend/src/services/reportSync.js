const { dependencyRevision, digest } = require("./readRevisions");

// Opt-in protocol: older apps continue receiving the original paginated JSON.
async function beginReportSync(req, filter, dependencies) {
  if (req.query.sync !== "true") return null;
  const since = new Date(); // Capture BEFORE reads, so concurrent writes are replayed.
  let references;
  try { references = await dependencyRevision(dependencies); } catch { return null; }
  const scope = digest([String(req.user._id), req.user.role, filter, process.env.APP_TIMEZONE || "Asia/Kolkata"]);
  const previous = new Date(req.query.syncSince);
  const delta = Number.isFinite(previous.getTime()) && previous <= since
    && since - previous < 5 * 60_000
    && req.query.syncScope === scope && req.query.syncReferences === references;
  return { marker: { since: since.toISOString(), scope, references }, delta, previous };
}

function changedTimeLogFilter(filter, previous) {
  const { startedAt: _startedAt, $or: _overlap, status: _status, ...scope } = filter;
  return { ...scope, $or: [
    { updatedAt: { $gte: new Date(previous.getTime() - 1_000) } },
    { status: { $in: ["running", "paused"] } },
  ] };
}

function deltaRows(rows, transform = (row) => row) {
  const records = [];
  const removedIds = [];
  for (const row of rows) {
    const record = transform(row);
    if (record) records.push(record);
    else removedIds.push(String(row._id));
  }
  return { records, removedIds };
}

module.exports = { beginReportSync, changedTimeLogFilter, deltaRows };

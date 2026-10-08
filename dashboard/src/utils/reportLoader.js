export function mergeReportRows(previous, changed, removedIds = [], sortField = "startedAt") {
  const records = new Map(previous.map((row) => [String(row._id), row]));
  for (const id of removedIds) records.delete(String(id));
  for (const row of changed) records.set(String(row._id), row);
  return [...records.values()].sort((a, b) =>
    (new Date(b[sortField] || 0) - new Date(a[sortField] || 0)) || String(b._id).localeCompare(String(a._id)));
}

export function createReportLoader(fetchPage, getSessionKey = () => "") {
  const cache = new Map();
  const inFlight = new Map();
  async function load(path, collectionKey, params = {}, { force = true } = {}) {
    const session = getSessionKey();
    const key = JSON.stringify([session, path, collectionKey, params]);
    const pending = inFlight.get(key);
    if (pending) {
      if (!force) return pending;
      try { await pending; } catch { /* A manual refresh gets a fresh attempt. */ }
      return load(path, collectionKey, params, { force: true });
    }
    const previous = cache.get(key);
    const marker = !force && previous && Date.now() - previous.loadedAt < 5 * 60_000 ? previous.data.sync : null;
    const syncParams = marker ? { syncSince: marker.since, syncScope: marker.scope, syncReferences: marker.references } : {};
    const operation = (async () => {
      const first = await fetchPage(path, { ...params, ...syncParams, sync: "true", page: 1, limit: 100 });
      let records;
      if (first.delta && previous && marker) {
        records = mergeReportRows(previous.data[collectionKey], first[collectionKey] || [], first.removedIds,
          collectionKey === "attendance" ? "date" : "startedAt");
      } else {
        records = [...(first[collectionKey] || [])];
        for (let page = 2; page <= Math.max(Number(first.totalPages) || 1, 1); page += 1) {
          const data = await fetchPage(path, { ...params, sync: "true", page, limit: 100 });
          records.push(...(data[collectionKey] || []));
        }
        records = [...new Map(records.map((row) => [String(row._id), row])).values()];
      }
      if (getSessionKey() !== session) throw new Error("The signed-in session changed during report loading.");
      const data = { ...(first.delta ? previous.data : first), ...first, delta: false,
        page: 1, count: records.length, totalRecords: records.length, [collectionKey]: records };
      if (first.sync && records.length <= 50_000) {
        cache.delete(key);
        while (cache.size >= 12) cache.delete(cache.keys().next().value);
        cache.set(key, { data, loadedAt: first.delta ? previous.loadedAt : Date.now() });
      } else cache.delete(key);
      return data;
    })();
    inFlight.set(key, operation);
    try { return await operation; } finally { if (inFlight.get(key) === operation) inFlight.delete(key); }
  }
  return load;
}

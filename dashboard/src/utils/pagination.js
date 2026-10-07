export async function collectAllPages(fetchPage, collectionKey) {
  const records = [];
  for (let page = 1; ; page += 1) {
    const data = await fetchPage({ page, limit: 100 });
    records.push(...(data[collectionKey] || []));
    if (page >= Math.max(Number(data.totalPages) || 1, 1)) return records;
  }
}

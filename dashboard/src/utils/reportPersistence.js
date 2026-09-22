export const readReportState = (key) => {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export const writeReportState = (key, state) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Report filters still work when browser storage is unavailable.
  }
};

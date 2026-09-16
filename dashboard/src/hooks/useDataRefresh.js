import { useEffect, useRef } from "react";

// Management data should follow changes from the other client quickly without
// turning every page into a continuous stream of API requests.
const DEFAULT_REFRESH_MS = 10_000;

export default function useDataRefresh(refresh, intervalMs = DEFAULT_REFRESH_MS) {
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") void refreshRef.current?.();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(run, intervalMs);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}

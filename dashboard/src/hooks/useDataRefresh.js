import { useEffect, useRef } from "react";

// Management data should follow changes from the other client quickly without
// turning every page into a continuous stream of API requests.
const DEFAULT_REFRESH_MS = 30_000;

export default function useDataRefresh(refresh, intervalMs = DEFAULT_REFRESH_MS) {
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    // Guards against a timer/event tick that fires (or was already in
    // flight) right as the component unmounts — once unmounted, no new
    // invocation of the consumer's refresh callback is allowed, so it can
    // never set state on an unmounted component from a race like that.
    const mountedRef = { current: true };
    let refreshing = false;
    const run = async () => {
      if (!mountedRef.current || refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        await refreshRef.current?.();
      } finally {
        refreshing = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(run, intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}

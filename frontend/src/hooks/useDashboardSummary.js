import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardSummary, getToken, WORKOUTS_CHANGED } from "../lib/api.js";

const initialState = { data: null, loading: true, error: "", sessionExpired: false };

// This week's meals and the soonest active goals. Reloads on the same events as the
// workout summary, and when workouts change, because tracked goals count workouts.
export default function useDashboardSummary() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState(initialState);
  const request = useRef(null);

  const refresh = useCallback(
    ({ invalidate = false } = {}) => {
      if (!userId) return Promise.resolve();
      const running = request.current;
      if (running) {
        // A workout saved during this read means the read may be out of date.
        if (invalidate) running.invalidated = true;
        return running.promise;
      }

      const active = { controller: new AbortController(), invalidated: false };
      const token = getToken();
      request.current = active;
      const timeout = window.setTimeout(() => active.controller.abort(), 20_000);
      // A response is ignored once the page has moved on or another account signed in.
      const isCurrent = () => request.current === active && getToken() === token;

      active.promise = (async () => {
        try {
          const data = await getDashboardSummary({ signal: active.controller.signal });
          if (isCurrent() && !active.invalidated) {
            setState({ ...initialState, userId, data, loading: false });
          }
        } catch (error) {
          if (!isCurrent() || active.invalidated) return;
          setState((current) => ({
            ...current,
            userId,
            // An ended session hides the private numbers; the workout status offers sign-in.
            ...(error.status === 401 ? { data: null } : {}),
            loading: false,
            error: error.status === 401 ? "" : "Couldn’t load your meals and goals.",
            sessionExpired: error.status === 401,
          }));
        } finally {
          window.clearTimeout(timeout);
          if (request.current === active) {
            request.current = null;
            if (active.invalidated && getToken() === token) return refresh();
          }
        }
      })();
      return active.promise;
    },
    [userId],
  );

  useEffect(() => {
    setState({ ...initialState, userId });
    refresh();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const invalidate = () => {
      if (document.visibilityState === "visible") refresh({ invalidate: true });
    };
    const handleStorage = (event) => {
      if (event.key === WORKOUTS_CHANGED) invalidate();
    };

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener(WORKOUTS_CHANGED, invalidate);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 60_000);

    return () => {
      const active = request.current;
      request.current = null;
      active?.controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener(WORKOUTS_CHANGED, invalidate);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh, userId]);

  const { userId: owner, ...view } = state;
  return { ...(owner === userId ? view : initialState), refresh };
}

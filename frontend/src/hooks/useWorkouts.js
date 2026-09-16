import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { getToken, getWorkouts, WORKOUTS_CHANGED } from "../lib/api.js";

const initialState = {
  data: null,
  loading: true,
  pending: false,
  refreshing: false,
  error: "",
  sessionExpired: false,
  updatedAt: null,
};

export default function useWorkouts({
  summary = false,
  analytics = false,
  date,
} = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const key = `${userId}:${summary}:${analytics}:${date || ""}`;
  const [state, setState] = useState(initialState);
  const request = useRef(null);

  const refresh = useCallback(
    ({ quiet = false, invalidate = false } = {}) => {
      if (!userId) return Promise.resolve();
      const running = request.current;
      if (running && !running.controller.signal.aborted) {
        // A save or removal during a fetch requires a fresh read afterward.
        if (invalidate) running.invalidated = true;
        return running.promise;
      }

      const active = {
        controller: new AbortController(),
        invalidated: false,
        timedOut: false,
      };
      const token = getToken();
      request.current = active;
      setState((current) => ({
        ...current,
        pending: true,
        refreshing: !quiet,
      }));
      const timeout = window.setTimeout(() => {
        active.timedOut = true;
        active.controller.abort();
      }, 20_000);
      const isCurrent = () =>
        request.current === active && getToken() === token;

      active.promise = (async () => {
        try {
          const data = await getWorkouts({
            summary,
            analytics,
            date,
            signal: active.controller.signal,
          });
          if (
            isCurrent() &&
            !active.controller.signal.aborted &&
            !active.invalidated
          ) {
            setState({
              ...initialState,
              key,
              data,
              loading: false,
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          if (
            !isCurrent() ||
            (active.controller.signal.aborted && !active.timedOut)
          )
            return;
          if (active.invalidated) return;
          setState((current) => ({
            ...current,
            key,
            ...(error.status === 401 ? { data: null, updatedAt: null } : {}),
            loading: false,
            error:
              error.status === 401
                ? "Your session has expired. Sign in again to see your workouts."
                : "Couldn’t load your workouts. Try refreshing.",
            sessionExpired: error.status === 401,
          }));
        } finally {
          window.clearTimeout(timeout);
          if (request.current === active) {
            request.current = null;
            if (active.invalidated && getToken() === token) {
              return refresh({ quiet: true });
            }
            setState((current) => ({
              ...current,
              pending: false,
              refreshing: false,
            }));
          }
        }
      })();
      return active.promise;
    },
    [date, key, summary, analytics, userId],
  );

  useEffect(() => {
    setState({ ...initialState, key });
    refresh({ quiet: true });

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh({ quiet: true });
    };
    const invalidate = () => {
      if (document.visibilityState === "visible")
        refresh({ quiet: true, invalidate: true });
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
  }, [key, refresh]);

  const current = state.key === key ? state : initialState;
  return { ...current, workouts: current.data?.workouts || [], refresh };
}

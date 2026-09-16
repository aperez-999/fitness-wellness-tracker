import { useEffect, useRef, useState } from "react";
import { getToken } from "../lib/api.js";

export default function useWorkoutMutation() {
  const active = useRef(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => () => active.current?.abort(), []);

  async function run(operation, onSuccess) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const token = getToken();
    setPending(true);
    setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await operation(controller.signal);
      if (!controller.signal.aborted && getToken() === token) onSuccess(result);
    } catch (failure) {
      if (getToken() === token)
        setError({
          message:
            failure.status === 401
              ? "Your session expired. Sign in again to make changes."
              : failure.status === 404
                ? "This session no longer exists. Refresh your workouts."
                : failure.fields && Object.keys(failure.fields).length
                  ? "Check the highlighted details."
                  : "Couldn’t confirm the change. Refresh your workouts or try again.",
          fields: failure.fields || {},
        });
    } finally {
      window.clearTimeout(timeout);
      active.current = null;
      setPending(false);
    }
  }
  return { pending, error, run };
}

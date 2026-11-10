import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";
const MAX_BUTTON_WIDTH = 400;

let scriptLoading;

function loadGoogleScript() {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptLoading = undefined;
      script.remove();
      reject(new Error("Google sign-in failed to load"));
    };
    document.head.append(script);
  });
  return scriptLoading;
}

// Google's own button. Signing in sets the session; the page it sits on then
// redirects like it does after a password login.
export default function GoogleSignIn() {
  const { loginWithGoogle } = useAuth();
  const button = useRef(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let active = true;

    async function handleCredential({ credential }) {
      setError("");
      try {
        await loginWithGoogle(credential);
      } catch (err) {
        if (active) setError(err.message || "Could not sign in with Google. Try again.");
      }
    }

    loadGoogleScript()
      .then(() => {
        if (!active || !button.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(button.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(MAX_BUTTON_WIDTH, button.current.offsetWidth),
        });
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [loginWithGoogle]);

  if (!CLIENT_ID || unavailable) return null;

  return (
    <div className="auth-google">
      <p className="auth-divider">or</p>
      <div ref={button} className="auth-google-button" />
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

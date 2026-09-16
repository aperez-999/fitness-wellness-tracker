import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = location.state?.from || "/dashboard";

  if (!loading && isAuthenticated) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError("Use at least 8 characters, including a number and a symbol.");
      return;
    }
    setSubmitting(true);
    try {
      await signup({ email, password, confirmPassword });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Keep a record of the days you move."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <fieldset disabled={submitting}>
          <FormField
            id="signup-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <FormField
            id="signup-password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters, including a number and a symbol."
          />
          <FormField
            id="signup-confirm"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="progress-button">
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </fieldset>
      </form>
      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login" state={location.state} className="text-link">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

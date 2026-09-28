import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";

import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import PasswordChecklist, { passwordChecks } from "../components/PasswordChecklist.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function validateField(field, value, password) {
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid email address.";
  }
  if (field === "password" && !passwordChecks(value).every((check) => check.met)) {
    return "Use at least 8 characters, including a number and a symbol.";
  }
  if (field === "confirmPassword") {
    if (!value) return "Confirm your password.";
    if (value !== password) return "Passwords do not match.";
  }
  return undefined;
}

export default function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useRef(null);
  const [values, setValues] = useState({ email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = location.state?.from || "/dashboard";

  if (!loading && isAuthenticated) return <Navigate to={redirectTo} replace />;

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
    setErrors((current) => ({
      ...current,
      [field]: current[field] ? validateField(field, value, values.password) : undefined,
      ...(field === "password" && current.confirmPassword
        ? { confirmPassword: validateField("confirmPassword", values.confirmPassword, value) }
        : {}),
    }));
  }

  function checkField(field) {
    setErrors((current) => ({ ...current, [field]: validateField(field, values[field], values.password) }));
  }

  function focusError() {
    requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const nextErrors = Object.fromEntries(Object.entries(values).map(([field, value]) =>
      [field, validateField(field, value, values.password)]));
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      focusError();
      return;
    }
    setSubmitting(true);
    try {
      await signup({ ...values, email: values.email.trim() });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setErrors({ email: "An account with this email already exists." });
        focusError();
      } else {
        setError(err.message || "Could not create your account. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" description="Keep a record of the days you move.">
      <form ref={form} className="auth-form" onSubmit={handleSubmit} noValidate>
        <fieldset disabled={submitting}>
          <FormField
            id="signup-email" label="Email" type="email" value={values.email}
            onChange={(event) => update("email", event.target.value)}
            onBlur={() => checkField("email")} error={errors.email}
            placeholder="you@example.com" autoComplete="email"
          />
          <FormField
            id="signup-password" label="Password" type="password" value={values.password}
            onChange={(event) => update("password", event.target.value)}
            onBlur={() => checkField("password")} error={errors.password}
            autoComplete="new-password" minLength={8}
            hint={<PasswordChecklist password={values.password} />}
          />
          <FormField
            id="signup-confirm" label="Confirm password" type="password"
            visibilityLabel="password confirmation" value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            onBlur={() => checkField("confirmPassword")} error={errors.confirmPassword}
            autoComplete="new-password"
          />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="progress-button">
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </fieldset>
      </form>
      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login" state={location.state} className="text-link">Log in</Link>
      </p>
    </AuthLayout>
  );
}

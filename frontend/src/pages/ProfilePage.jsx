import { useState } from "react";

import FormField from "../components/FormField.jsx";
import PageCard from "../components/PageCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const DISPLAY_NAME_MAX = 80;

function displayNameError(value) {
  if (typeof value !== "string") return "Enter a display name.";
  if (value.trim().length > DISPLAY_NAME_MAX) {
    return "Keep your display name to 80 characters or fewer.";
  }
  return "";
}

function formatJoined(createdAt) {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const nextError = displayNameError(displayName);
    setError(nextError);
    setFormError("");
    setSaved(false);
    if (nextError) return;

    setSubmitting(true);
    try {
      const updated = await updateProfile({ displayName: displayName.trim() });
      setDisplayName(updated.displayName || "");
      setSaved(true);
    } catch (err) {
      const fieldError = err.fields?.displayName;
      if (fieldError) setError(fieldError);
      else setFormError(err.message || "Could not save your profile. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageCard
      title="Profile"
      description="Account details for the signed-in user."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="text-slate-800">{user?.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Member since</dt>
          <dd className="text-slate-800">{formatJoined(user?.createdAt)}</dd>
        </div>
      </dl>
      <form className="mt-6 grid max-w-md gap-4" onSubmit={handleSubmit} noValidate>
        <fieldset className="grid gap-4" disabled={submitting}>
          <FormField
            id="profile-display-name"
            label="Display name"
            required={false}
            value={displayName}
            autoComplete="nickname"
            hint="Optional. Shown in the sidebar and on your dashboard."
            error={error}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError("");
              setFormError("");
              setSaved(false);
            }}
          />
          {formError && (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          )}
          {saved && (
            <p role="status">Display name saved.</p>
          )}
          <button type="submit" className="progress-button">
            {submitting ? "Saving…" : "Save profile"}
          </button>
        </fieldset>
      </form>
    </PageCard>
  );
}

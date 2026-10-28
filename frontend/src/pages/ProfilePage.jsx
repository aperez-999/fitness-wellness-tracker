import { useState } from "react";

import mobility from "../assets/activities/mobility.svg";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./profile.css";

const DISPLAY_NAME_MAX = 80;
const PRONOUNS_MAX = 40;
const ABOUT_ME_MAX = 280;
const ACTIVITIES = ["Walk", "Strength", "Run", "Cycle", "Mobility"];

function textError(value, max, missing, tooLong) {
  if (typeof value !== "string") return missing;
  if (value.trim().length > max) return tooLong;
  return "";
}

function profileErrors(values) {
  const activitiesAllowed = values.favoriteActivities.every((item) => ACTIVITIES.includes(item))
    && new Set(values.favoriteActivities).size === values.favoriteActivities.length;
  return {
    displayName: textError(
      values.displayName,
      DISPLAY_NAME_MAX,
      "Enter a display name.",
      "Keep your display name to 80 characters or fewer.",
    ),
    pronouns: textError(
      values.pronouns,
      PRONOUNS_MAX,
      "Enter pronouns as text.",
      "Keep pronouns to 40 characters or fewer.",
    ),
    aboutMe: textError(
      values.aboutMe,
      ABOUT_ME_MAX,
      "Enter an about me as text.",
      "Keep your about me to 280 characters or fewer.",
    ),
    favoriteActivities: activitiesAllowed ? "" : "Choose activities from the list.",
  };
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
  const [pronouns, setPronouns] = useState(user?.pronouns || "");
  const [aboutMe, setAboutMe] = useState(user?.aboutMe || "");
  const [favoriteActivities, setFavoriteActivities] = useState(user?.favoriteActivities || []);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function clearSaved() {
    setFormError("");
    setSaved(false);
  }

  function toggleActivity(activity) {
    setFavoriteActivities((current) => (
      current.includes(activity)
        ? current.filter((item) => item !== activity)
        : [...current, activity]
    ));
    setErrors((current) => ({ ...current, favoriteActivities: "" }));
    clearSaved();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const values = { displayName, pronouns, aboutMe, favoriteActivities };
    const nextErrors = profileErrors(values);
    setErrors(nextErrors);
    setFormError("");
    setSaved(false);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const updated = await updateProfile({
        displayName: displayName.trim(),
        pronouns: pronouns.trim(),
        aboutMe: aboutMe.trim(),
        favoriteActivities,
      });
      setDisplayName(updated.displayName || "");
      setPronouns(updated.pronouns || "");
      setAboutMe(updated.aboutMe || "");
      setFavoriteActivities(updated.favoriteActivities || []);
      setSaved(true);
    } catch (err) {
      const fieldErrors = err.fields || {};
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else setFormError(err.message || "Could not save your profile. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const name = user?.displayName || user?.email?.split("@")[0] || "there";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="profile-page">
      <header className="profile-intro page-banner banner-profile">
        <div>
          <h1>Profile</h1>
          <p>Hello, {name}. These details stay with your account.</p>
        </div>
        <div className="banner-art" aria-hidden="true">
          <img src={mobility} alt="" width="120" height="88" />
        </div>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={submitting}>
          <section className="profile-section" aria-labelledby="profile-account">
            <h2 id="profile-account">Account</h2>
            <div className="profile-identity">
              <span className="profile-avatar" aria-hidden="true">{initials}</span>
              <dl className="profile-facts">
              <div>
                <dt>Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatJoined(user?.createdAt)}</dd>
              </div>
              </dl>
            </div>
          </section>
          <section className="profile-section" aria-labelledby="profile-about-heading">
            <h2 id="profile-about-heading">About you</h2>
            <FormField
              id="profile-display-name"
              label="Display name"
              required={false}
              value={displayName}
              autoComplete="nickname"
              hint="Optional. Shown in the sidebar and on your dashboard."
              error={errors.displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setErrors((current) => ({ ...current, displayName: "" }));
                clearSaved();
              }}
            />
            <FormField
              id="profile-pronouns"
              label="Pronouns"
              required={false}
              value={pronouns}
              autoComplete="off"
              hint="Optional. Shown on your profile."
              error={errors.pronouns}
              onChange={(event) => {
                setPronouns(event.target.value);
                setErrors((current) => ({ ...current, pronouns: "" }));
                clearSaved();
              }}
            />
            <FormField
              id="profile-about"
              label="About me"
              required={false}
              multiline
              rows={5}
              value={aboutMe}
              hint="Optional. Up to 280 characters."
              error={errors.aboutMe}
              onChange={(event) => {
                setAboutMe(event.target.value);
                setErrors((current) => ({ ...current, aboutMe: "" }));
                clearSaved();
              }}
            />
            <div className="form-field">
              <span id="profile-activities-label" className="field-label">Favorite activities</span>
              <div
                className="profile-activities"
                role="group"
                aria-labelledby="profile-activities-label"
                aria-describedby={errors.favoriteActivities ? "profile-activities-error" : "profile-activities-hint"}
              >
                {ACTIVITIES.map((activity) => (
                  <button
                    key={activity}
                    type="button"
                    className="profile-activity"
                    aria-pressed={favoriteActivities.includes(activity)}
                    onClick={() => toggleActivity(activity)}
                  >
                    {activity}
                  </button>
                ))}
              </div>
              <div id="profile-activities-hint" className="field-hint">
                Optional. Choose the ways you like to move.
              </div>
              {errors.favoriteActivities && (
                <p id="profile-activities-error" className="field-error">
                  {errors.favoriteActivities}
                </p>
              )}
            </div>
            {formError && (
              <p className="auth-error" role="alert">
                {formError}
              </p>
            )}
            {saved && (
              <p className="notice-success" role="status"><Icon name="check" size={16} />Profile saved.</p>
            )}
            <button type="submit" className="progress-button" aria-busy={submitting}>
              {submitting ? "Saving…" : "Save profile"}
            </button>
          </section>
        </fieldset>
      </form>
    </div>
  );
}

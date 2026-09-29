export const DISPLAY_NAME_MAX = 80;
export const PRONOUNS_MAX = 40;
export const ABOUT_ME_MAX = 280;
export const FAVORITE_ACTIVITIES = ["Walk", "Strength", "Run", "Cycle", "Mobility"];

function optionalText(value, max, missingMessage, lengthMessage) {
  if (typeof value !== "string") return missingMessage;
  const trimmed = value.trim();
  if (trimmed.length > max) return lengthMessage;
  return { value: trimmed || null };
}

export function validateProfileUpdate(body) {
  const errors = {};
  const profile = {};

  const displayName = optionalText(
    body?.displayName,
    DISPLAY_NAME_MAX,
    "Enter a display name.",
    "Keep your display name to 80 characters or fewer.",
  );
  if (typeof displayName === "string") errors.displayName = displayName;
  else profile.displayName = displayName.value;

  const pronouns = optionalText(
    body?.pronouns,
    PRONOUNS_MAX,
    "Enter pronouns as text.",
    "Keep pronouns to 40 characters or fewer.",
  );
  if (typeof pronouns === "string") errors.pronouns = pronouns;
  else profile.pronouns = pronouns.value;

  const aboutMe = optionalText(
    body?.aboutMe,
    ABOUT_ME_MAX,
    "Enter an about me as text.",
    "Keep your about me to 280 characters or fewer.",
  );
  if (typeof aboutMe === "string") errors.aboutMe = aboutMe;
  else profile.aboutMe = aboutMe.value;

  const activities = body?.favoriteActivities;
  const allowed = Array.isArray(activities)
    && activities.every((item) => FAVORITE_ACTIVITIES.includes(item))
    && new Set(activities).size === activities.length;
  if (!allowed) {
    errors.favoriteActivities = "Choose activities from the list.";
  } else {
    profile.favoriteActivities = activities;
  }

  if (Object.keys(errors).length) return { errors };
  return profile;
}

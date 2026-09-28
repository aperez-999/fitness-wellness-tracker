export const DISPLAY_NAME_MAX = 80;

export function validateProfileUpdate(body) {
  const displayName = body?.displayName;
  if (typeof displayName !== "string") {
    return { errors: { displayName: "Enter a display name." } };
  }

  const trimmed = displayName.trim();
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return {
      errors: {
        displayName: "Keep your display name to 80 characters or fewer.",
      },
    };
  }

  return { displayName: trimmed || null };
}

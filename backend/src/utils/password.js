const PASSWORD_RULES_MESSAGE =
  "Password must be at least 8 characters and include 1 number and 1 symbol";

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

export function validatePassword(password) {
  if (!password || !PASSWORD_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_RULES_MESSAGE };
  }
  return { valid: true };
}

export function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return { valid: false, message: "A valid email is required" };
  }
  return { valid: true };
}

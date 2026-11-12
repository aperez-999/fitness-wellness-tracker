import bcrypt from "bcryptjs";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { verifyGoogleCredential } from "../utils/googleIdentity.js";
import { signToken } from "../utils/jwt.js";
import { validateEmail, validatePassword } from "../utils/password.js";
import { validateProfileUpdate } from "../utils/profileValidation.js";

const router = Router();
const BCRYPT_ROUNDS = 10;

function toPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName || null,
    pronouns: user.pronouns || null,
    aboutMe: user.aboutMe || null,
    favoriteActivities: user.favoriteActivities || [],
    createdAt: user.createdAt,
  };
}

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, confirmPassword, displayName } = req.body ?? {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.message });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "Email, password, and password confirmation are required",
      });
    }

    // A number such as -1234567.5 passes the password rules, but bcrypt can only hash text.
    if (typeof password !== "string" || typeof confirmPassword !== "string") {
      return res.status(400).json({ message: "Password and password confirmation must be text" });
    }

    if (displayName != null && typeof displayName !== "string") {
      return res.status(400).json({ message: "Display name must be text" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName?.trim() || undefined,
    });

    const token = signToken(user._id.toString());

    return res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password must be text" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const valid = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id.toString());

    return res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/google -> sign in, or create an account, with a Google ID token.
router.post("/google", async (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ message: "Google sign-in is not configured yet." });
  }

  const { credential } = req.body ?? {};
  if (typeof credential !== "string" || !credential || credential.length > 4096) {
    return res.status(400).json({ message: "A Google credential is required" });
  }

  let account;
  try {
    account = await verifyGoogleCredential(credential);
  } catch {
    return res.status(401).json({ message: "Google sign-in could not be verified. Try again." });
  }

  try {
    let user = await User.findOne({ googleId: account.googleId });
    let status = 200;

    if (!user) {
      // Emails are not verified at signup, so a password account is never linked
      // automatically: whoever created it would keep access through its password.
      if (await User.exists({ email: account.email })) {
        return res.status(409).json({
          message: "An account with this email already exists. Log in with your password.",
        });
      }

      user = await User.create(account);
      status = 201;
    }

    return res.status(status).json({
      token: signToken(user._id.toString()),
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    next(error);
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const result = validateProfileUpdate(req.body);
    if (result.errors) {
      return res.status(400).json({
        message: "Check your profile details.",
        errors: result.errors,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        displayName: result.displayName,
        pronouns: result.pronouns,
        aboutMe: result.aboutMe,
        favoriteActivities: result.favoriteActivities,
      },
      { new: true, runValidators: true },
    ).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;

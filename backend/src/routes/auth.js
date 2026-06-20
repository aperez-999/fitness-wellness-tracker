import bcrypt from "bcryptjs";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { validateEmail, validatePassword } from "../utils/password.js";

const router = Router();
const BCRYPT_ROUNDS = 10;

function toPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName || null,
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

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));

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

export default router;

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Accounts created with Google have a googleId and no password.
    passwordHash: {
      type: String,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    pronouns: {
      type: String,
      trim: true,
    },
    aboutMe: {
      type: String,
      trim: true,
    },
    favoriteActivities: {
      type: [String],
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);

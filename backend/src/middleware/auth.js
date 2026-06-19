import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

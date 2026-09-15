import crypto from "crypto";

export const ADMIN_COOKIE = "admin_auth";

export function tokenFor(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function isAdmin(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const cookie = request.cookies.get(ADMIN_COOKIE);
  return Boolean(cookie) && cookie.value === tokenFor(expected);
}

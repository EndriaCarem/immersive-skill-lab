import { createHash, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";
import { SITE_ACCESS_MAX_AGE } from "./site-access";

export async function siteAccessSession() {
  const password = process.env["SITE_SESSION_SECRET"];
  if (!password) throw new Error("Restricted access is not configured");
  return useSession<{ unlocked?: boolean }>({
    password, name: "empiria-site-access", maxAge: SITE_ACCESS_MAX_AGE,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

function matches(input: string, expected: string) {
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(expected).digest());
}

export function verifySiteCredentials(username: string, password: string) {
  const expectedUser = process.env["SITE_ACCESS_USERNAME"];
  const expectedPassword = process.env["SITE_PASSWORD"];
  if (!expectedUser || !expectedPassword) return false;
  const userMatches = matches(username, expectedUser);
  const passwordMatches = matches(password, expectedPassword);
  return userMatches && passwordMatches;
}
import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth/options";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/request-ip";
import { logger } from "@/server/logger";

const baseHandler = NextAuth(authOptions);

const LOGIN_LIMIT = {
  limit: 5,
  windowMs: 5 * 60 * 1000,
} as const;

const LOGIN_LIMIT_MESSAGE =
  "Trop de tentatives de connexion. Merci de patienter quelques minutes avant de réessayer.";

function shouldRateLimit(request: NextRequest) {
  return (
    request.method === "POST" &&
    request.nextUrl.pathname.endsWith("/callback/credentials")
  );
}

async function handler(request: NextRequest, ...rest: Parameters<typeof baseHandler>) {
  if (shouldRateLimit(request)) {
    const ip = getClientIpFromRequest(request);
    const key = `login:${ip}`;
    const result = consumeRateLimit({
      key,
      limit: LOGIN_LIMIT.limit,
      windowMs: LOGIN_LIMIT.windowMs,
    });

    if (!result.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((result.resetAt - Date.now()) / 1000),
      );
      logger.warn(
        { ipAddress: ip, route: request.nextUrl.pathname },
        "Limite de tentatives de connexion dépassée",
      );
      return NextResponse.json(
        { error: LOGIN_LIMIT_MESSAGE },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      );
    }
  }

  return baseHandler(request, ...rest);
}

export { handler as GET, handler as POST };

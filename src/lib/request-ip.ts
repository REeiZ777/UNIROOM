type HeaderLike =
  | Headers
  | {
      get(name: string): string | null | undefined;
    };

const FALLBACK_IP = "0.0.0.0";

function extractFromForwarded(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const [first] = value.split(",").map((part) => part.trim());
  return first?.length ? first : null;
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value.includes("::ffff:")) {
    return value.split("::ffff:").pop() ?? null;
  }
  return value;
}

export function getClientIpFromHeaders(headers: HeaderLike | null | undefined) {
  if (!headers) {
    return FALLBACK_IP;
  }

  const forwarded = extractFromForwarded(
    headers.get?.("x-forwarded-for") ?? headers.get?.("X-Forwarded-For"),
  );
  const realIp = headers.get?.("x-real-ip") ?? headers.get?.("X-Real-Ip");
  const candidate = normalizeIp(forwarded || realIp);

  return candidate ?? FALLBACK_IP;
}

export function getClientIpFromRequest(
  request:
    | { ip?: string | null; headers?: HeaderLike; socket?: { remoteAddress?: string | null } }
    | null
    | undefined,
) {
  if (!request) {
    return FALLBACK_IP;
  }

  const fromProperty = normalizeIp(
    typeof request.ip === "string" && request.ip.length > 0 ? request.ip : null,
  );
  if (fromProperty) {
    return fromProperty;
  }

  if (request.headers) {
    const headerIp = getClientIpFromHeaders(request.headers);
    if (headerIp !== FALLBACK_IP) {
      return headerIp;
    }
  }

  const socketIp = normalizeIp(request.socket?.remoteAddress ?? null);
  return socketIp ?? FALLBACK_IP;
}

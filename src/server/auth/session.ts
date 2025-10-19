import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth/options";

export function getSession() {
  return getServerSession(authOptions);
}

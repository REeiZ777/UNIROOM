import { redirect } from "next/navigation";

import { ProtectedLayoutShell } from "@/components/protected-layout-shell";
import { getSession } from "@/server/auth/session";

const uiStrings = {
  loginRedirect: "/login",
} as const;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect(uiStrings.loginRedirect);
  }

  return (
    <ProtectedLayoutShell>{children}</ProtectedLayoutShell>
  );
}

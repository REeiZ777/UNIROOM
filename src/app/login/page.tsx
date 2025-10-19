import { Suspense } from "react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";

const uiStrings = {
  title: "Connexion UNIROOM",
  description:
    "Accedez a votre espace pour gerer les reservations de salles et suivre la disponibilite en temps reel.",
} as const;

export const metadata: Metadata = {
  title: uiStrings.title,
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{uiStrings.title}</CardTitle>
          <CardDescription>{uiStrings.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

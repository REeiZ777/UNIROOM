"use client";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Page introuvable</h1>
        <p className="text-sm text-muted-foreground">
          La ressource demandée n&apos;existe pas ou n&apos;est plus disponible.
        </p>
      </div>
    </main>
  );
}

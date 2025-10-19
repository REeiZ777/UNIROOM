"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Une erreur est survenue</h1>
        <p className="text-sm text-muted-foreground">
          Impossible de terminer l&apos;opération. Merci de réessayer dans quelques instants.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}

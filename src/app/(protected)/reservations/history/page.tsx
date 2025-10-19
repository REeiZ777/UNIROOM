"use client";

import Link from "next/link";

const uiStrings = {
  title: "Historique des réservations",
  subtitle:
    "Consultez les réservations passées et à venir. Cette page est amenée à évoluer avec des filtres avancés.",
  backLabel: "Retour aux réservations",
} as const;

export default function ReservationsHistoryPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{uiStrings.title}</h1>
        <p className="text-sm text-muted-foreground">{uiStrings.subtitle}</p>
      </header>

      <section className="rounded-xl border bg-card/50 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Le module d&apos;historique sera bientôt disponible. En attendant, retrouvez la liste
          complète des réservations sur la page principale.
        </p>
        <div className="mt-4">
          <Link
            href="/reservations"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {uiStrings.backLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

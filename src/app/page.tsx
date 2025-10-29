import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

import { Topbar } from "@/components/topbar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_TIME_ZONE,
  OPENING_HOURS,
  SLOT_DURATION_MINUTES,
  getTimeZoneOffsetLabel,
} from "@/lib/time";

const uiStrings = {
  welcomeTitle: "Bienvenue sur UNIROOM",
  welcomeDescription:
    "Centralisez la planification des salles, visualisez instantan\u00E9ment les disponibilit\u00E9s et \u00E9vitez les conflits de r\u00E9servation.",
  todaysDateLabel: "Aujourd'hui",
  scheduleTitle: "R\u00E9sum\u00E9 de la journ\u00E9e",
  scheduleDescription: "Horaires d'ouverture",
  nextReservationTitle: "Prochaine r\u00E9servation",
  nextReservationEmpty: "Aucune r\u00E9servation planifi\u00E9e pour le moment.",
  nextReservationHint:
    "Les prochaines r\u00E9servations confirm\u00E9es appara\u00EEtront ici d\u00E8s la connexion.",
  quickActionsTitle: "Actions rapides",
  quickActionsDescription:
    "Connectez-vous pour cr\u00E9er, modifier ou supprimer des r\u00E9servations.",
  slotInfo: "Cr\u00E9neaux de 30 minutes, sans chevauchement possible.",
  timezoneLabelPrefix: "Fuseau horaire",
  connectionReminder:
    "R\u00E9serv\u00E9 aux administrateurs UNIROOM. Les acc\u00E8s sont fournis par l'\u00E9quipe op\u00E9rationnelle.",
} as const;

function capitalize(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export default function HomePage() {
  const todayInSchoolZone = capitalize(
    formatInTimeZone(new Date(), DEFAULT_TIME_ZONE, "EEEE d MMMM yyyy", {
      locale: fr,
    }),
  );
  const timeZoneOffset = getTimeZoneOffsetLabel();

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <Topbar />
      <main className="flex-1 bg-background pb-10 pt-6">
        <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col gap-6 px-4 sm:px-6 lg:px-10">
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {uiStrings.welcomeTitle}
                </CardTitle>
                <CardDescription>
                  {uiStrings.welcomeDescription}
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">
                    {uiStrings.todaysDateLabel} {" \u00B7 "}
                    {todayInSchoolZone}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-background/60 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {uiStrings.scheduleTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {uiStrings.scheduleDescription} : {OPENING_HOURS.start} - {OPENING_HOURS.end}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {uiStrings.slotInfo}
                  </p>
                </div>
                <div className="rounded-lg border bg-background/60 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {uiStrings.quickActionsTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {uiStrings.quickActionsDescription}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uiStrings.connectionReminder}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{uiStrings.nextReservationTitle}</CardTitle>
                <CardDescription>{uiStrings.nextReservationHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-dashed border-muted-foreground/30 bg-background/60 p-6 text-sm text-muted-foreground">
                  {uiStrings.nextReservationEmpty}
                </div>
                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <span>
                    {uiStrings.scheduleDescription} : {OPENING_HOURS.start} - {OPENING_HOURS.end}
                  </span>
                  <span>
                    {uiStrings.timezoneLabelPrefix} : {DEFAULT_TIME_ZONE} ({timeZoneOffset})
                  </span>
                  <span>
                    Dur\u00E9e minimale d&apos;un cr\u00E9neau : {SLOT_DURATION_MINUTES} minutes
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}



"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { addDays, addMinutes, parseISO, startOfWeek } from "date-fns";

import { fr } from "date-fns/locale";

import { formatInTimeZone } from "date-fns-tz";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import {

  usePathname,

  useRouter,

  useSearchParams,

} from "next/navigation";



import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { Calendar } from "@/components/ui/calendar";

import {

  Popover,

  PopoverContent,

  PopoverTrigger,

} from "@/components/ui/popover";


import { ReservationEvent, WeekGrid } from "@/components/reservations/week-grid";

import { getReservationDisplayTitle, getReservationSecondaryLabel } from "@/lib/reservations";

import { ReservationForm } from "@/components/reservations/reservation-form";

import { toast } from "@/components/ui/toaster";

import {

  OPENING_HOURS,

  SLOT_DURATION_MINUTES,

  combineDateAndTime,

  toHHmm,

} from "@/lib/time";

import type { ReservationInput } from "@/lib/validation";

import { resolveDepartmentFromGroup, type ColorMode } from "@/lib/departments";



const zone =

  process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ??

  process.env.SCHOOL_TIMEZONE ??

  "Africa/Abidjan";



const uiStrings = {

  statusFree: "Libre maintenant",

  statusBusy: "Occupee maintenant",

  dateLabel: "Date de consultation",

  weekLabel: "Semaine de consultation",

  hoursLabel: "Horaire",

  capacityLabel: "Capacite",

  locationLabel: "Localisation",

  buildingLabel: "Batiment",

  categoryLabel: "Categorie",

  unknown: "Non renseignee",

  bookButton: "Reserver cette salle",

  dialogTitle: "Nouvelle reservation",

  detailTitle: "Details de la reservation",

  detailNote: "Note",

  detailNoNote: "Aucune note renseignee.",

  detailObjective: "Objectif",

  detailGroup: "Participants",

  detailNoObjective: "Aucun objectif renseigne.",

  detailBuilding: "Batiment",

  detailCategory: "Categorie",

  detailLocation: "Localisation",

  detailCapacity: "Capacite",

  detailNoGroup: "Aucun groupe renseigne.",

  detailCreatedBy: "Cree par",

  weekLabelPrefix: "Semaine du",

  weekLabelSeparator: "au",

  fetchError: "Impossible de charger les reservations pour cette periode.",

} as const;;



type RoomViewContentProps = {

  room: {

    id: string;

    name: string;

    capacity: number | null;

    location: string | null;

    building: string | null;

    category: string | null;

  };

  rooms: Array<{ id: string; name: string }>;

  initialDate: string;

  initialReservations: ReservationEvent[];

};



type SlotSelection = {

  date: string;

  start: string;

  roomId?: string;

  durationMinutes?: number;

};



type ReservationLike = {

  id: string;

  roomId: string;

  roomName?: string | null;

  roomBuilding?: string | null;

  roomCategory?: string | null;

  roomLocation?: string | null;

  roomCapacity?: number | null;

  title: string;

  objective?: string | null;

  participantGroup?: string | null;

  note?: string | null;

  date?: string | Date;

  startTime: string | Date;

  endTime: string | Date;

  createdBy?: string | null;

  room?: {

    name?: string | null;

    building?: string | null;

    category?: string | null;

    location?: string | null;

    capacity?: number | null;

  } | null;

  user?: { name?: string | null; email?: string | null } | null;

};



function buildDefaultFormValues(

  roomId: string,

  date: string,

): ReservationInput {

  const baseStart = OPENING_HOURS.start;

  const startDate = combineDateAndTime(date, baseStart, zone);

  const suggestedEnd = toHHmm(addMinutes(startDate, SLOT_DURATION_MINUTES), zone);



  return {

    roomId,

    date,

    start: baseStart,

    end: suggestedEnd,

    objective: "Reunion",

    participantGroup: "Personne externe",

    title: "",

    note: "",

  };

}



function normaliseReservation(

  reservation: ReservationLike,

  fallbackRoomName: string,

): ReservationEvent {

  const startTimeIso =

    typeof reservation.startTime === "string"

      ? reservation.startTime

      : reservation.startTime.toISOString();

  const endTimeIso =

    typeof reservation.endTime === "string"

      ? reservation.endTime

      : reservation.endTime.toISOString();

  const dateIso =

    typeof reservation.date === "string"

      ? reservation.date

      : reservation.date instanceof Date

        ? reservation.date.toISOString()

        : startTimeIso;

  const department = resolveDepartmentFromGroup(

    reservation.participantGroup ?? null,

  );



  return {

    id: reservation.id,

    roomId: reservation.roomId,

    roomName:

      reservation.roomName ??

      reservation.room?.name ??

      fallbackRoomName ??

      reservation.roomId,

    roomBuilding:

      reservation.roomBuilding ??

      reservation.room?.building ??

      null,

    roomCategory:

      reservation.roomCategory ??

      reservation.room?.category ??

      null,

    roomLocation:

      reservation.roomLocation ??

      reservation.room?.location ??

      null,

    roomCapacity:

      reservation.roomCapacity ?? reservation.room?.capacity ?? null,

    title: reservation.title,

    objective: reservation.objective ?? null,

    participantGroup: reservation.participantGroup ?? null,

    note: reservation.note ?? null,

    date: dateIso,

    startTime: startTimeIso,

    endTime: endTimeIso,

    createdBy:

      reservation.createdBy ??

      reservation.user?.name ??

      reservation.user?.email ??

      "Auteur inconnu",

    departmentId: department?.id ?? null,

    departmentLabel: department?.label ?? null,

  };

}



export function RoomViewContent({

  room,

  rooms,

  initialDate,

  initialReservations,

}: RoomViewContentProps) {

  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [colorMode, setColorMode] = useState<ColorMode>("department");
  const [reservations, setReservations] =
    useState<ReservationEvent[]>(() =>
      initialReservations
        .map((reservation) => normaliseReservation(reservation, room.name))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
  const [isFetching, setIsFetching] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);

  const [detailReservation, setDetailReservation] =

    useState<ReservationEvent | null>(null);

  const [formDefaults, setFormDefaults] = useState<ReservationInput>(() =>

    buildDefaultFormValues(room.id, initialDate),

  );



  useEffect(() => {

    if (typeof window === "undefined") {

      return;

    }

    const stored = window.localStorage.getItem("reservation-color-mode");

    if (stored === "objective" || stored === "department") {

      setColorMode(stored);

    }

  }, []);



  useEffect(() => {
    const mapped = initialReservations
      .map((reservation) => normaliseReservation(reservation, room.name))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    setReservations(mapped);
  }, [initialReservations, room.name]);

  useEffect(() => {
    setSelectedDate(initialDate);
    setFormDefaults(buildDefaultFormValues(room.id, initialDate));
  }, [initialDate, room.id]);


  const todayIso = useMemo(

    () => formatInTimeZone(new Date(), zone, "yyyy-MM-dd"),

    [],

  );



  const selectedDateLabel = useMemo(() => {

    const reference = combineDateAndTime(selectedDate, "00:00", zone);

    return formatInTimeZone(reference, zone, "EEEE d MMMM yyyy", {

      locale: fr,

    });

  }, [selectedDate]);



  const weekStartIso = useMemo(() => {

    const startDate = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });

    return formatInTimeZone(startDate, zone, "yyyy-MM-dd");

  }, [selectedDate]);



  const weekRangeLabel = useMemo(() => {
    const weekStartDate = combineDateAndTime(weekStartIso, "00:00", zone);
    const weekEndDate = addDays(weekStartDate, 6);
    const startLabel = formatInTimeZone(weekStartDate, zone, "d MMMM", {
      locale: fr,
    });

    const endLabel = formatInTimeZone(weekEndDate, zone, "d MMMM yyyy", {

      locale: fr,

    });
    return `${uiStrings.weekLabelPrefix} ${startLabel} ${uiStrings.weekLabelSeparator} ${endLabel}`;
  }, [weekStartIso]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchWeek = async () => {
      setIsFetching(true);
      try {
        const startDate = parseISO(weekStartIso);
        if (Number.isNaN(startDate.getTime())) {
          setIsFetching(false);
          return;
        }
        const endDate = addDays(startDate, 7);
        const response = await fetch(
          `/api/reservations?start=${startDate.toISOString()}&end=${endDate.toISOString()}&roomId=${room.id}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error("fetch_failed");
        }
        const data: ReservationLike[] = await response.json();
        const ordered = data
          .map((reservation) => normaliseReservation(reservation, room.name))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        setReservations(ordered);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(uiStrings.fetchError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      }
    };

    fetchWeek();
    return () => controller.abort();
  }, [room.id, room.name, weekStartIso]);


  const periodLabel = weekRangeLabel;
  const periodHeading = uiStrings.weekLabel;


  const isOccupiedNow = useMemo(() => {

    const now = new Date();

    return reservations.some((reservation) => {

      const start = parseISO(reservation.startTime);

      const end = parseISO(reservation.endTime);

      return now >= start && now < end;

    });

  }, [reservations]);



  const statusBadge = isOccupiedNow ? uiStrings.statusBusy : uiStrings.statusFree;

  const statusVariant = isOccupiedNow ? "destructive" : "secondary";

  const detailDisplayTitle = detailReservation

    ? getReservationDisplayTitle(detailReservation)

    : null;

  const buildingLabel = room.building ?? uiStrings.unknown;

  const categoryLabel = room.category ?? uiStrings.unknown;

  const detailSecondaryLabel = detailReservation

    ? getReservationSecondaryLabel(detailReservation)

    : null;

  const detailObjectiveValue =

    detailReservation?.objective && detailReservation.objective.trim().length > 0

      ? detailReservation.objective

      : null;

  const detailGroupValue =

    detailReservation?.participantGroup &&

    detailReservation.participantGroup.trim().length > 0

      ? detailReservation.participantGroup

      : null;

  const detailBuildingValue =

    detailReservation?.roomBuilding && detailReservation.roomBuilding.trim().length > 0

      ? detailReservation.roomBuilding

      : uiStrings.unknown;

  const detailCategoryValue =

    detailReservation?.roomCategory && detailReservation.roomCategory.trim().length > 0

      ? detailReservation.roomCategory

      : uiStrings.unknown;

  const detailLocationValue =

    detailReservation?.roomLocation && detailReservation.roomLocation.trim().length > 0

      ? detailReservation.roomLocation

      : uiStrings.unknown;

  const detailCapacityValue =

    typeof detailReservation?.roomCapacity === "number"

      ? `${detailReservation.roomCapacity} places`

      : uiStrings.unknown;



  const updateQueryParams = useCallback(
    (dateIso: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (!dateIso || dateIso === todayIso) {
        params.delete("date");
      } else {
        params.set("date", dateIso);
      }
      params.delete("view");
      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      router.push(target, { scroll: false });
    },
    [pathname, router, searchParams, todayIso],
  );

  const handleDateChange = useCallback(
    (dateIso: string) => {
      if (!dateIso || Number.isNaN(Date.parse(dateIso))) {
        return;
      }
      setSelectedDate(dateIso);
      setFormDefaults(buildDefaultFormValues(room.id, dateIso));
      updateQueryParams(dateIso);
    },
    [room.id, updateQueryParams],
  );

  const handleWeekNavigate = useCallback(
    (direction: number) => {
      const currentStart = startOfWeek(parseISO(selectedDate), {
        weekStartsOn: 1,
      });
      const next = addDays(currentStart, direction * 7);
      const iso = formatInTimeZone(next, zone, "yyyy-MM-dd");
      handleDateChange(iso);
    },
    [handleDateChange, selectedDate],
  );


  const handleSlotSelect = useCallback(

    ({ date, start, roomId: slotRoomId, durationMinutes = SLOT_DURATION_MINUTES }: SlotSelection) => {

      const slotStart = combineDateAndTime(date, start, zone);

      const slotEnd = addMinutes(slotStart, durationMinutes);

      setFormDefaults({

        roomId: slotRoomId ?? room.id,

        date,

        start,

        end: toHHmm(slotEnd, zone),

        objective: "Reunion",

        participantGroup: "Personne externe",

        title: "",

        note: "",

      });

      setFormOpen(true);

      setDetailOpen(false);

    },

    [room.id],

  );



  const handleReservationSelect = useCallback((reservation: ReservationEvent) => {

    setDetailReservation(reservation);

    setDetailOpen(true);

  }, []);



  const handleFormSuccess = useCallback(
    (reservation: ReservationLike, mode: "create" | "edit") => {
      void mode;
      const mapped = normaliseReservation(reservation, room.name);
      setReservations((previous) => {
        const next = [...previous];
        const index = next.findIndex((item) => item.id === mapped.id);
        if (index >= 0) {
          next[index] = mapped;
        } else {
          next.push(mapped);
        }
        next.sort((a, b) => a.startTime.localeCompare(b.startTime));
        return next;
      });
      setFormOpen(false);
    },
    [room.name],
  );



  const handleDetailClose = useCallback(() => {

    setDetailOpen(false);

    setDetailReservation(null);

  }, []);



  const detailStartDate = detailReservation

    ? parseISO(detailReservation.startTime)

    : null;

  const detailEndDate = detailReservation

    ? parseISO(detailReservation.endTime)

    : null;



  return (

    <div className="flex flex-col gap-6 pb-8">

      <header className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <Badge variant={statusVariant} className="uppercase tracking-wide">
              {statusBadge}
            </Badge>
            <h1 className="text-2xl font-semibold text-foreground">{room.name}</h1>
            <p className="text-sm text-muted-foreground">
              {buildingLabel} - {categoryLabel} -{" "}
              {typeof room.capacity === "number"
                ? `${room.capacity} places`
                : uiStrings.unknown}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 gap-y-2">
            <span className="min-w-[14rem] text-sm text-muted-foreground">
              {periodHeading}: <span className="font-medium text-foreground">{periodLabel}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-[2.25rem] justify-center"
                onClick={() => handleWeekNavigate(-1)}
                aria-label="Semaine precedente"
              >
                <ChevronLeftIcon aria-hidden className="size-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-[12rem] justify-start"
                    aria-label="Choisir une date"
                  >
                    <CalendarIcon aria-hidden className="mr-2 size-4" />
                    <span className="truncate">{selectedDateLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={parseISO(selectedDate)}
                    onSelect={(dateValue) => {
                      if (!dateValue) {
                        return;
                      }
                      const iso = formatInTimeZone(dateValue, zone, "yyyy-MM-dd");
                      handleDateChange(iso);
                    }}
                    initialFocus
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-[2.25rem] justify-center"
                onClick={() => handleWeekNavigate(1)}
                aria-label="Semaine suivante"
              >
                <ChevronRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            <span className="font-medium">{uiStrings.locationLabel} :</span> {room.location ?? uiStrings.unknown}
          </span>
          <span>
            <span className="font-medium">{uiStrings.buildingLabel} :</span> {buildingLabel}
          </span>
          <span>
            <span className="font-medium">{uiStrings.categoryLabel} :</span> {categoryLabel}
          </span>
          <span>
            <span className="font-medium">{uiStrings.capacityLabel} :</span>{" "}
            {typeof room.capacity === "number"
              ? `${room.capacity} places`
              : uiStrings.unknown}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setFormOpen(true)}>
            {uiStrings.bookButton}
          </Button>
          {isFetching && (
            <span className="text-sm text-muted-foreground">
              Chargement des reservations...
            </span>
          )}
        </div>
      </header>



      <section className="space-y-4 rounded-xl border bg-card/50 p-6 shadow-sm">
        <WeekGrid
          weekStart={weekStartIso}
          reservations={reservations}
          roomId={room.id}
          colorMode={colorMode}
          onSlotSelect={handleSlotSelect}
          onReservationSelect={handleReservationSelect}
          onNavigate={handleWeekNavigate}
        />
      </section>



      <Dialog open={formOpen} onOpenChange={setFormOpen}>

        <DialogContent className="w-[min(100vw-2rem,40rem)] max-h-[90vh] overflow-y-auto sm:max-w-xl">

          <DialogHeader>

            <DialogTitle>{uiStrings.dialogTitle}</DialogTitle>

          </DialogHeader>

          <ReservationForm

            rooms={rooms}

            defaultValues={formDefaults}

            onSuccess={handleFormSuccess}

            onCancel={() => setFormOpen(false)}

          />

        </DialogContent>

      </Dialog>



      <Dialog open={detailOpen} onOpenChange={(open) => (open ? setDetailOpen(true) : handleDetailClose())}>

        <DialogContent className="w-[min(100vw-2rem,34rem)] max-h-[80vh] overflow-y-auto sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>{uiStrings.detailTitle}</DialogTitle>

            {detailReservation && detailDisplayTitle && (

              <DialogDescription>

                {detailDisplayTitle}

                {detailSecondaryLabel && (

                  <span className="mt-1 block text-xs text-muted-foreground">

                    {detailSecondaryLabel}

                  </span>

                )}

              </DialogDescription>

            )}

          </DialogHeader>

          {detailReservation && detailStartDate && detailEndDate ? (

            <div className="space-y-3 text-sm">

              <p>

                <span className="font-medium">{uiStrings.dateLabel} :</span>{" "}

                {formatInTimeZone(detailStartDate, zone, "EEEE d MMMM yyyy", { locale: fr })}

              </p>

              <p>

                <span className="font-medium">{uiStrings.hoursLabel} :</span>{" "}

                {toHHmm(detailStartDate, zone)} - {toHHmm(detailEndDate, zone)}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailBuilding} :</span>{" "}

                {detailBuildingValue}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailCategory} :</span>{" "}

                {detailCategoryValue}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailLocation} :</span>{" "}

                {detailLocationValue}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailCapacity} :</span>{" "}

                {detailCapacityValue}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailObjective} :</span>{" "}

                {detailObjectiveValue ?? uiStrings.detailNoObjective}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailGroup} :</span>{" "}

                {detailGroupValue ?? uiStrings.detailNoGroup}

              </p>

              <p>

                <span className="font-medium">{uiStrings.detailCreatedBy} :</span>{" "}

                {detailReservation.createdBy}

              </p>

              <div>

                <p className="font-medium">{uiStrings.detailNote}</p>

                <p className="text-muted-foreground">

                  {detailReservation.note && detailReservation.note.trim().length > 0

                    ? detailReservation.note

                    : uiStrings.detailNoNote}

                </p>

              </div>

            </div>

          ) : (

            <p className="text-sm text-muted-foreground">

              Selectionnez une reservation pour voir ses details.

            </p>

          )}

        </DialogContent>

      </Dialog>

    </div>

  );

}




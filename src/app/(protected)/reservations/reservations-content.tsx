"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { addDays, addMinutes, formatISO, parseISO, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/filter-bar";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { DayGrid } from "@/components/reservations/day-grid";
import { ReservationEvent } from "@/components/reservations/week-grid";
import { ReservationInteractionsProvider } from "@/components/reservations/reservation-interactions";
import type { ReservationInput } from "@/lib/validation";
import { OPENING_HOURS, SLOT_DURATION_MINUTES, combineDateAndTime, toHHmm } from "@/lib/time";
import {
  getReservationDisplayTitle,
  getReservationSecondaryLabel,
} from "@/lib/reservations";
import { resolveDepartmentFromGroup, type ColorMode } from "@/lib/departments";
import { sortRoomsByDisplayOrder } from "@/lib/rooms";
import { createReservation, deleteReservation } from "@/server/reservations/actions";
import { toast } from "@/components/ui/toaster";

import { CalendarIcon, FilterIcon, XIcon } from "lucide-react";
import { fr } from "date-fns/locale";

const zone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

const uiStrings = {
  headline: "Reservations",
  subheadline:
    "Filtrez vos reservations par salle, par date ou via la recherche, puis naviguez de jour en jour.",
  newReservation: "Reserver une salle",
  editReservation: "Modifier la reservation",
  detailTitle: "Details de la reservation",
  detailRoom: "Salle",
  detailDate: "Date",
  detailTime: "Horaire",
  detailBuilding: "Batiment",
  detailCategory: "Categorie",
  detailLocation: "Localisation",
  detailCapacity: "Capacite",
  detailObjective: "Objectif",
  detailGroup: "Participants",
  detailNote: "Note",
  detailCreatedBy: "Cree par",
  detailNoNote: "Aucune note renseignee.",
  detailNoObjective: "Aucun objectif renseigne.",
  detailNoGroup: "Aucun groupe renseigne.",
  detailNoBuilding: "Batiment non renseigne.",
  detailNoCategory: "Categorie non renseignee.",
  detailNoLocation: "Localisation non renseignee.",
  detailNoCapacity: "Capacite non renseignee.",
  editAction: "Modifier",
  deleteAction: "Supprimer",
  deleteConfirmTitle: "Confirmer la suppression",
  deleteConfirmMessage:
    "Cette action est definitive. Voulez-vous supprimer cette reservation ?",
  deleteConfirmCta: "Supprimer",
  deleteCancelCta: "Annuler",
  deleteSuccess: "Reservation supprimee avec succes.",
  deleteError: "Impossible de supprimer la reservation.",
  fetchError: "Impossible de charger les reservations.",
  roomPlaceholder: "Toutes les salles",
  tableFiltersTitle: "Filtres de la liste",
  tableRoomLabel: "Salle",
  tableDateLabel: "Date",
  tableDatePlaceholder: "Toutes les dates",
  tableReset: "Reinitialiser",
} as const;

type RoomSummary = {
  id: string;
  name: string;
  building?: string | null;
  location?: string | null;
  capacity?: number | null;
};

type ReservationsContentProps = {
  rooms: RoomSummary[];
  initialDate: string;
  initialReservations?: ReservationEvent[];
  initialRoomIds?: string[];
  initialTableRoomId?: string | null;
  initialTableDate?: string | null;
  tableSlot?: ReactNode;
};

type SlotSelection = {
  date: string;
  start: string;
  roomId?: string;
  durationMinutes?: number;
};

function toReservationEvent(
  reservation: {
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
    note: string | null;
    date: Date | string;
    startTime: Date | string;
    endTime: Date | string;
    createdBy?: string | null;
    room?: {
      name?: string | null;
      building?: string | null;
      category?: string | null;
      location?: string | null;
      capacity?: number | null;
    } | null;
    user?: {
      name?: string | null;
      email?: string | null;
    } | null;
  },
  fallbackRoomName?: string,
): ReservationEvent {
  const createdBy =
    reservation.createdBy ??
    reservation.user?.name ??
    reservation.user?.email ??
    "Auteur inconnu";

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
      reservation.roomBuilding ?? reservation.room?.building ?? null,
    roomCategory:
      reservation.roomCategory ?? reservation.room?.category ?? null,
    roomLocation:
      reservation.roomLocation ?? reservation.room?.location ?? null,
    roomCapacity:
      reservation.roomCapacity ?? reservation.room?.capacity ?? null,
    title: reservation.title,
    objective: reservation.objective ?? null,
    participantGroup: reservation.participantGroup ?? null,
    note: reservation.note,
    date:
      typeof reservation.date === "string"
        ? reservation.date
        : reservation.date.toISOString(),
    startTime:
      typeof reservation.startTime === "string"
        ? reservation.startTime
        : reservation.startTime.toISOString(),
    endTime:
      typeof reservation.endTime === "string"
        ? reservation.endTime
        : reservation.endTime.toISOString(),
    createdBy,
    departmentId: department?.id ?? null,
    departmentLabel: department?.label ?? null,
  };
}

function getWeekStartIso(dateIso: string) {
  const start = startOfWeek(parseISO(dateIso), { weekStartsOn: 1 });
  return formatISO(start, { representation: "date" });
}

function buildDefaultFormValues(
  rooms: RoomSummary[],
  date: string,
  selectedRoomIds: string[],
): ReservationInput {
  const orderedRooms = sortRoomsByDisplayOrder(rooms);
  const baseStart = OPENING_HOURS.start;
  const startDate = combineDateAndTime(date, baseStart, zone);
  const suggestedEnd = toHHmm(addMinutes(startDate, SLOT_DURATION_MINUTES), zone);
  const roomId = selectedRoomIds[0] ?? orderedRooms[0]?.id ?? "";

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

function buildFormValuesFromEvent(event: ReservationEvent): ReservationInput {
  const startDate = parseISO(event.startTime);
  const endDate = parseISO(event.endTime);

  return {
    roomId: event.roomId,
    date: formatInTimeZone(startDate, zone, "yyyy-MM-dd"),
    start: toHHmm(startDate, zone),
    end: toHHmm(endDate, zone),
    objective: event.objective ?? "Reunion",
    participantGroup: event.participantGroup ?? "Personne externe",
    title: event.title,
    note: event.note ?? "",
  };
}



export function ReservationsContent({
  rooms,
  initialDate,
  initialReservations = [],
  initialRoomIds = [],
  initialTableRoomId = null,
  initialTableDate = null,
  tableSlot,
}: ReservationsContentProps) {
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialRoomIds);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStartIso(initialDate));
  const [colorMode, setColorMode] = useState<ColorMode>("department");
  const [reservations, setReservations] = useState<ReservationEvent[]>(initialReservations);
  const [tableRoomFilter, setTableRoomFilter] = useState<string>(initialTableRoomId ?? "all");
  const [tableDateFilter, setTableDateFilter] = useState<string>(initialTableDate ?? "");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingReservation, setEditingReservation] = useState<ReservationEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReservation, setDetailReservation] = useState<ReservationEvent | null>(null);
  const roomsSorted = useMemo(() => sortRoomsByDisplayOrder(rooms), [rooms]);
  const firstRoomId = roomsSorted[0]?.id ?? "";
  const roomNameById = useMemo(() => new Map(roomsSorted.map((room) => [room.id, room.name ?? room.id])), [roomsSorted]);
  const [createDefaults, setCreateDefaults] = useState<ReservationInput>(() =>
    buildDefaultFormValues(roomsSorted, initialDate, initialRoomIds),
  );
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [restoreDetailOnClose, setRestoreDetailOnClose] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setSelectedRoomIds(initialRoomIds ?? []);
  }, [initialRoomIds]);

  useEffect(() => {
    setTableRoomFilter(initialTableRoomId ?? "all");
  }, [initialTableRoomId]);

  useEffect(() => {
    setTableDateFilter(initialTableDate ?? "");
  }, [initialTableDate]);

  useEffect(() => {
    setSelectedDate(initialDate);
    setWeekStart(getWeekStartIso(initialDate));
  }, [initialDate]);

  useEffect(() => {
    setCreateDefaults(buildDefaultFormValues(roomsSorted, selectedDate, selectedRoomIds));
  }, [roomsSorted, selectedDate, selectedRoomIds]);

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
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("reservation-color-mode", colorMode);
  }, [colorMode]);

  const updateQueryParams = useCallback(
    (updates: {
      roomIds?: string[];
      date?: string;
      page?: number;
      tableRoom?: string | null;
      tableDate?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (updates.roomIds !== undefined) {
        const value = updates.roomIds;
        if (!value || value.length === 0) {
          params.delete("room");
        } else {
          params.set("room", value.join(","));
        }
      }

      if (updates.date !== undefined) {
        if (!updates.date) {
          params.delete("date");
        } else {
          params.set("date", updates.date);
        }
      }

      if (updates.page !== undefined) {
        const pageValue = updates.page ?? 1;
        if (pageValue <= 1) {
          params.delete("page");
        } else {
          params.set("page", String(pageValue));
        }
      }

      if (updates.tableRoom !== undefined) {
        const roomValue = updates.tableRoom;
        if (!roomValue || roomValue === "all") {
          params.delete("tableRoom");
        } else {
          params.set("tableRoom", roomValue);
        }
      }

      if (updates.tableDate !== undefined) {
        const dateValue = updates.tableDate;
        if (!dateValue || dateValue.length === 0) {
          params.delete("tableDate");
        } else {
          params.set("tableDate", dateValue);
        }
      }

      const queryString = params.toString();
      const target = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    const fetchWeek = async () => {
      try {
        const startDate = combineDateAndTime(weekStart, "00:00", zone);
        const endDate = addDays(startDate, 7);
        const response = await fetch(
          `/api/reservations?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("fetch_failed");
        }
        const data: ReservationEvent[] = await response.json();
        setReservations(data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(uiStrings.fetchError);
        }
      } finally {
        /* noop */
      }
    };
    fetchWeek();
    return () => controller.abort();
  }, [weekStart]);

  const tableDateDisplay = useMemo(() => {
    if (!tableDateFilter) {
      return uiStrings.tableDatePlaceholder;
    }
    try {
      const parsed = parseISO(tableDateFilter);
      if (Number.isNaN(parsed.getTime())) {
        return uiStrings.tableDatePlaceholder;
      }
      return formatInTimeZone(parsed, zone, "EEEE d MMMM yyyy", { locale: fr });
    } catch {
      return uiStrings.tableDatePlaceholder;
    }
  }, [tableDateFilter]);

  const hasActiveTableFilters = useMemo(
    () =>
      (tableRoomFilter && tableRoomFilter !== "all") ||
      tableDateFilter.length > 0,
    [tableRoomFilter, tableDateFilter],
  );

  const filteredReservations = useMemo(() => {
    const selectedSet =
      selectedRoomIds.length === 0 ? null : new Set(selectedRoomIds);
    return selectedSet === null
      ? reservations
      : reservations.filter((reservation) => selectedSet.has(reservation.roomId));
  }, [reservations, selectedRoomIds]);

  const handleRoomChange = useCallback(
    (values: string[]) => {
      setSelectedRoomIds(values);
      updateQueryParams({ roomIds: values, page: 1 });
    },
    [updateQueryParams],
  );

  const handleDateChange = useCallback(
    (iso: string) => {
      setSelectedDate(iso);
      updateQueryParams({ date: iso, page: 1 });
      const newWeekStart = getWeekStartIso(iso);
      if (newWeekStart !== weekStart) {
        setWeekStart(newWeekStart);
      }
    },
    [updateQueryParams, weekStart],
  );

  const handleDateShift = useCallback(
    (offset: number) => {
      const base = parseISO(selectedDate);
      const next = addDays(base, offset);
      const iso = formatInTimeZone(next, zone, "yyyy-MM-dd");
      handleDateChange(iso);
    },
    [handleDateChange, selectedDate],
  );

  const handleDateReset = useCallback(() => {
    const todayIso = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
    handleDateChange(todayIso);
  }, [handleDateChange]);

  const handleTableRoomFilterChange = useCallback(
    (value: string) => {
      setTableRoomFilter(value);
      updateQueryParams({
        tableRoom: value === "all" ? null : value,
        page: 1,
      });
    },
    [updateQueryParams],
  );

  const handleTableDateFilterChange = useCallback(
    (value: string | null) => {
      if (!value) {
        setTableDateFilter("");
        updateQueryParams({ tableDate: null, page: 1 });
        return;
      }
      setTableDateFilter(value);
      updateQueryParams({ tableDate: value, page: 1 });
    },
    [updateQueryParams],
  );

  const handleTableFiltersReset = useCallback(() => {
    setTableRoomFilter("all");
    setTableDateFilter("");
    updateQueryParams({
      tableRoom: null,
      tableDate: null,
      page: 1,
    });
  }, [updateQueryParams]);

  const handleSlotSelect = useCallback(
    ({ date, start, roomId, durationMinutes }: SlotSelection) => {
      handleDateChange(date);
      setFormMode("create");
      setEditingReservation(null);
      setIsDeleteConfirm(false);
      setRestoreDetailOnClose(false);
      const slotLength = durationMinutes ?? SLOT_DURATION_MINUTES;
      setCreateDefaults((prev) => ({
        ...prev,
        date,
        start,
        end: toHHmm(
          addMinutes(combineDateAndTime(date, start, zone), slotLength),
          zone,
        ),
        roomId: roomId ?? selectedRoomIds[0] ?? firstRoomId,
      }));
      setFormDialogOpen(true);
      setDetailOpen(false);
    },
    [handleDateChange, selectedRoomIds, firstRoomId],
  );

  const openCreateDialog = useCallback(() => {
    setFormMode("create");
    setEditingReservation(null);
    setIsDeleteConfirm(false);
    setRestoreDetailOnClose(false);
    setFormDialogOpen(true);
    setDetailOpen(false);
  }, []);

  const handleEditRequest = useCallback(
    (reservation?: ReservationEvent) => {
      const target = reservation ?? detailReservation;
      if (!target) {
        return;
      }

      setFormMode("edit");
      setEditingReservation(target);
      setIsDeleteConfirm(false);
      setRestoreDetailOnClose(!reservation);
      setFormDialogOpen(true);
      setDetailOpen(false);
      setDetailReservation(target);
    },
    [detailReservation],
  );

  const handleFormCancel = useCallback(
    (options?: { close?: boolean; restoreDetail?: boolean }) => {
      const shouldClose = options?.close ?? true;
      const shouldRestore =
        options?.restoreDetail ?? (restoreDetailOnClose && Boolean(detailReservation));

      if (shouldClose) {
        setFormDialogOpen(false);
      }
      if (shouldRestore && detailReservation) {
        setDetailOpen(true);
      }
      setEditingReservation(null);
      setFormMode("create");
      setIsDeleteConfirm(false);
      setRestoreDetailOnClose(false);
    },
    [detailReservation, restoreDetailOnClose],
  );

  const handleDeleteRequest = useCallback((reservation: ReservationEvent) => {
    setDetailReservation(reservation);
    setDetailOpen(true);
    setIsDeleteConfirm(true);
    setRestoreDetailOnClose(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!detailReservation) {
      return;
    }

    const { id } = detailReservation;

    startDeleteTransition(() => {
      deleteReservation(id)
        .then(() => {
          toast.success(uiStrings.deleteSuccess);
          setReservations((prev) => prev.filter((reservation) => reservation.id !== id));
          setDetailReservation(null);
          setDetailOpen(false);
          setEditingReservation(null);
          setFormMode("create");
          setRestoreDetailOnClose(false);
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : uiStrings.deleteError;
          toast.error(message);
        })
        .finally(() => {
          setIsDeleteConfirm(false);
          setRestoreDetailOnClose(false);
        });
    });
  }, [detailReservation, startDeleteTransition]);

  const handleReservationSelect = useCallback((reservation: ReservationEvent) => {
    setDetailReservation(reservation);
    setIsDeleteConfirm(false);
    setRestoreDetailOnClose(false);
    setDetailOpen(true);
  }, []);

  const handleSuccess = useCallback(
    (
      reservation: Awaited<ReturnType<typeof createReservation>>,
      mode: "create" | "edit",
    ) => {
      const roomName = roomNameById.get(reservation.roomId) ?? reservation.room?.name ?? reservation.roomId;
      const serialised = toReservationEvent(reservation, roomName);
      setReservations((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((item) => item.id === serialised.id);
        if (existingIndex >= 0) {
          next[existingIndex] = serialised;
          return next;
        }
        return [...next, serialised];
      });
      if (mode === "edit") {
        setDetailReservation(serialised);
        setDetailOpen(false);
      }
      setFormDialogOpen(false);
      setEditingReservation(null);
      setFormMode("create");
      setIsDeleteConfirm(false);
      setRestoreDetailOnClose(false);
    },
    [roomNameById],
  );

  const defaultRoomId = selectedRoomIds[0] ?? firstRoomId;
  const formDialogTitle = formMode === "edit" ? uiStrings.editReservation : uiStrings.newReservation;
  const formDefaultValues =
    formMode === "edit" && editingReservation
      ? buildFormValuesFromEvent(editingReservation)
      : {
          ...createDefaults,
          roomId: defaultRoomId,
        };
  const reservationIdForForm =
    formMode === "edit" && editingReservation ? editingReservation.id : undefined;
  const detailStartDate = detailReservation ? parseISO(detailReservation.startTime) : null;
  const detailEndDate = detailReservation ? parseISO(detailReservation.endTime) : null;
  const detailDateLabel =
    detailStartDate
      ? formatInTimeZone(detailStartDate, zone, "EEEE d MMMM yyyy", { locale: fr })
      : "";
const detailTimeLabel =
  detailStartDate && detailEndDate
    ? `${toHHmm(detailStartDate, zone)} - ${toHHmm(detailEndDate, zone)}`
    : "";
const detailBuildingValue =
  detailReservation?.roomBuilding &&
  detailReservation.roomBuilding.trim().length > 0
    ? detailReservation.roomBuilding
    : uiStrings.detailNoBuilding;
const detailCategoryValue =
  detailReservation?.roomCategory &&
  detailReservation.roomCategory.trim().length > 0
    ? detailReservation.roomCategory
    : uiStrings.detailNoCategory;
const detailLocationValue =
  detailReservation?.roomLocation &&
  detailReservation.roomLocation.trim().length > 0
    ? detailReservation.roomLocation
    : uiStrings.detailNoLocation;
const detailCapacityValue =
  typeof detailReservation?.roomCapacity === "number"
    ? `${detailReservation.roomCapacity} places`
    : uiStrings.detailNoCapacity;
  const detailDisplayTitle = detailReservation
    ? getReservationDisplayTitle(detailReservation)
    : "";
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

  const interactionsValue = useMemo(
    () => ({
      viewReservation: handleReservationSelect,
      editReservation: handleEditRequest,
      deleteReservation: handleDeleteRequest,
    }),
    [handleDeleteRequest, handleEditRequest, handleReservationSelect],
  );

  return (
    <ReservationInteractionsProvider value={interactionsValue}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {uiStrings.headline}
            </h1>
            <p className="text-sm text-muted-foreground">
              {uiStrings.subheadline}
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="hidden md:inline-flex"
          >
            {uiStrings.newReservation}
          </Button>
        </header>

        <FilterBar
          rooms={roomsSorted}
          selectedRoomIds={selectedRoomIds}
          onRoomChange={handleRoomChange}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onDateShift={handleDateShift}
          onDateReset={handleDateReset}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />

        <Dialog
          open={formDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleFormCancel({ close: false });
            }
            setFormDialogOpen(open);
          }}
        >
          <DialogContent className="w-[min(100vw-2rem,44rem)] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{formDialogTitle}</DialogTitle>
            </DialogHeader>
            <ReservationForm
              rooms={roomsSorted}
              defaultValues={formDefaultValues}
              reservationId={reservationIdForForm}
              mode={formMode}
              onSuccess={handleSuccess}
              onCancel={() => handleFormCancel()}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setIsDeleteConfirm(false);
              setRestoreDetailOnClose(false);
            }
          }}
        >
          <DialogContent className="w-[min(100vw-2rem,36rem)] max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{uiStrings.detailTitle}</DialogTitle>
              {detailReservation && (
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
            {detailReservation && (
              <>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">{uiStrings.detailRoom} :</span>{" "}
                      {detailReservation.roomName}
                    </p>
                    <p>
                      <span className="font-medium">{uiStrings.detailDate} :</span>{" "}
                      {detailDateLabel}
                    </p>
                    <p>
                      <span className="font-medium">{uiStrings.detailTime} :</span>{" "}
                      {detailTimeLabel}
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
                  </div>
                  <div>
                    <p className="font-medium">{uiStrings.detailNote}</p>
                    <p className="text-muted-foreground">
                      {detailReservation.note && detailReservation.note.trim().length > 0
                        ? detailReservation.note
                        : uiStrings.detailNoNote}
                    </p>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  {isDeleteConfirm ? (
                    <div className="flex w-full flex-col gap-4">
                      <div>
                        <p className="text-sm font-medium">{uiStrings.deleteConfirmTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {uiStrings.deleteConfirmMessage}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDeleteConfirm(false)}
                          disabled={isDeletePending}
                        >
                          {uiStrings.deleteCancelCta}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeleteConfirm}
                          disabled={isDeletePending}
                        >
                          {isDeletePending ? "Suppression..." : uiStrings.deleteConfirmCta}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleEditRequest()}
                        disabled={isDeletePending}
                      >
                        {uiStrings.editAction}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteConfirm(true)}
                        disabled={isDeletePending}
                      >
                        {uiStrings.deleteAction}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <DayGrid
          date={selectedDate}
          rooms={roomsSorted}
          reservations={filteredReservations}
          selectedRoomIds={selectedRoomIds}
          colorMode={colorMode}
          onSlotSelect={handleSlotSelect}
          onReservationSelect={handleReservationSelect}
        />

        <section className="mt-6 rounded-xl border bg-card/50 shadow-sm">
          <div className="space-y-4 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FilterIcon className="size-4" aria-hidden />
                <span>{uiStrings.tableFiltersTitle}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTableFiltersReset}
                disabled={!hasActiveTableFilters}
                className="gap-2"
              >
                <XIcon className="size-4" aria-hidden />
                {uiStrings.tableReset}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {uiStrings.tableRoomLabel}
                </label>
                <Select value={tableRoomFilter} onValueChange={handleTableRoomFilterChange}>
                  <SelectTrigger className="justify-between">
                    <SelectValue placeholder={uiStrings.roomPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiStrings.roomPlaceholder}</SelectItem>
                    {roomsSorted.map((room) => (
                      <SelectItem key={`table-room-${room.id}`} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {uiStrings.tableDateLabel}
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start"
                        aria-label={uiStrings.tableDateLabel}
                      >
                        <CalendarIcon aria-hidden className="mr-2 size-4" />
                        <span className="truncate text-sm">{tableDateDisplay}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tableDateFilter ? parseISO(tableDateFilter) : undefined}
                        onSelect={(value) =>
                          handleTableDateFilterChange(
                            value
                              ? formatInTimeZone(value, zone, "yyyy-MM-dd")
                              : null,
                          )
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {tableDateFilter ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={uiStrings.tableDatePlaceholder}
                      onClick={() => handleTableDateFilterChange(null)}
                    >
                      <XIcon className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="[&>section]:border-none [&>section]:bg-transparent [&>section]:shadow-none [&>section]:rounded-none">
            {tableSlot}
          </div>
        </section>
      </div>
    </ReservationInteractionsProvider>
  );
}































"use client";

import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { parseISO } from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_TIME_ZONE } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, OBJECTIVE_COLORS, type ColorMode } from "@/lib/departments";
import { sortRoomsByDisplayOrder } from "@/lib/rooms";

const uiStrings = {
  roomLabel: "Salle",
  roomPlaceholder: "Toutes les salles",
  roomClear: "Tout selectionner",
  roomSelectionCount: (count: number) =>
    `${count} ${count > 1 ? "salles selectionnees" : "salle selectionnee"}`,
  dateLabel: "Date",
  dateButtonAria: "Choisir une date",
  previousDay: "Jour precedent",
  nextDay: "Jour suivant",
  today: "Aujourd'hui",
  filtersTitle: "Filtres actifs",
  colorModeLabel: "Jeu de couleurs",
  colorModeDepartment: "Departements",
  colorModeObjective: "Objectifs",
  colorModeToggleAria:
    "Basculer l'affichage des couleurs par departement ou par objectif",
  legendLabel: "Legende des couleurs",
} as const;

type FilterBarProps = {
  rooms: Array<{ id: string; name: string }>;
  selectedRoomIds: string[];
  onRoomChange: (value: string[]) => void;
  selectedDate: string;
  onDateChange: (value: string) => void;
  onDateShift: (offset: number) => void;
  onDateReset?: () => void;
  colorMode: ColorMode;
  onColorModeChange: (value: ColorMode) => void;
};

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function FilterBar({
  rooms,
  selectedRoomIds,
  onRoomChange,
  selectedDate,
  onDateChange,
  onDateShift,
  onDateReset,
  colorMode,
  onColorModeChange,
}: FilterBarProps) {
  const [roomPopoverOpen, setRoomPopoverOpen] = useState(false);
  const showReset = Boolean(onDateReset);
  const orderedRooms = useMemo(
    () => sortRoomsByDisplayOrder(rooms),
    [rooms],
  );

  const selectedDateObject = useMemo(
    () => (selectedDate ? parseISO(selectedDate) : new Date()),
    [selectedDate],
  );

  const formattedDate = useMemo(
    () =>
      formatInTimeZone(
        selectedDateObject,
        DEFAULT_TIME_ZONE,
        "EEEE d MMMM yyyy",
        { locale: fr },
      ),
    [selectedDateObject],
  );

  const selectedRooms = useMemo(() => {
    if (selectedRoomIds.length === 0) {
      return orderedRooms;
    }
    const selected = new Set(selectedRoomIds);
    return orderedRooms.filter((room) => selected.has(room.id));
  }, [orderedRooms, selectedRoomIds]);

  const roomLabel =
    selectedRoomIds.length === 0
      ? uiStrings.roomPlaceholder
      : selectedRooms.length === 1
        ? selectedRooms[0]?.name ?? uiStrings.roomPlaceholder
        : uiStrings.roomSelectionCount(selectedRooms.length);

  const badgeLabel =
    selectedRoomIds.length === 0
      ? uiStrings.roomPlaceholder
      : selectedRooms.length <= 2
        ? selectedRooms.map((room) => room.name).join(", ")
        : uiStrings.roomSelectionCount(selectedRooms.length);
  const colorModeDisplay =
    colorMode === "objective"
      ? uiStrings.colorModeObjective
      : uiStrings.colorModeDepartment;
  const legendItems = useMemo(() => {
    if (colorMode === "objective") {
      return [
        { key: "cours", label: "Cours", description: null, color: OBJECTIVE_COLORS.cours.background },
        { key: "examen", label: "Examen", description: null, color: OBJECTIVE_COLORS.examen.background },
        { key: "other", label: "Autres", description: null, color: OBJECTIVE_COLORS.other.background },
      ];
    }
    return Object.entries(DEPARTMENTS).map(([key, value]) => ({
      key,
      label: value.shortLabel,
      description: value.label,
      color: value.colors.background,
    }));
  }, [colorMode]);

  const handleToggleRoom = (roomId: string) => {
    if (selectedRoomIds.length === 0) {
      const next = orderedRooms
        .filter((room) => room.id !== roomId)
        .map((room) => room.id);
      onRoomChange(next);
      return;
    }
    if (selectedRoomIds.includes(roomId)) {
      const next = selectedRoomIds.filter((id) => id !== roomId);
      onRoomChange(next);
      return;
    }
    onRoomChange([...selectedRoomIds, roomId]);
  };

  const handleSelectAll = () => {
    onRoomChange([]);
  };

  const handleColorModeToggle = () => {
    onColorModeChange(
      colorMode === "objective" ? "department" : "objective",
    );
  };

  return (
    <section
      aria-labelledby="filters-heading"
      className="flex flex-col gap-4 rounded-xl border bg-card/50 p-3 shadow-sm sm:p-4"
    >
      <div
        className={cn(
          "grid w-full items-start gap-4",
          "md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]",
          "xl:grid-cols-[minmax(0,260px)_minmax(0,320px)_minmax(0,1fr)]",
        )}
      >
        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {uiStrings.roomLabel}
          </label>
          <Popover open={roomPopoverOpen} onOpenChange={setRoomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={uiStrings.roomLabel}
                className="w-full justify-between"
              >
                <span className="truncate text-sm">{roomLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(16rem,85vw)] p-0" align="start">
              <div className="flex flex-col gap-2 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-sm"
                  onClick={() => {
                    handleSelectAll();
                    setRoomPopoverOpen(false);
                  }}
                >
                  {uiStrings.roomClear}
                </Button>
                <div className="max-h-64 overflow-y-auto">
                  {orderedRooms.map((room) => {
                    const checked =
                      selectedRoomIds.length === 0 ||
                      selectedRoomIds.includes(room.id);
                    return (
                      <label
                        key={room.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60",
                          checked ? "bg-muted/60" : undefined,
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleRoom(room.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="truncate">{room.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {uiStrings.dateLabel}
          </label>
          <div
            className={cn(
              "grid w-full items-center gap-2",
              showReset
                ? "grid-cols-[minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                : "grid-cols-[minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto]",
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={uiStrings.previousDay}
              onClick={() => onDateShift(-1)}
              className="shrink-0"
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start sm:min-w-[14rem]"
                  aria-label={uiStrings.dateButtonAria}
                >
                  <CalendarIcon aria-hidden className="mr-2 size-4" />
                  <span className="truncate text-sm">{formattedDate}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDateObject}
                  onSelect={(value) => {
                    if (!value || isWeekend(value)) {
                      return;
                    }
                    const iso = formatInTimeZone(
                      value,
                      DEFAULT_TIME_ZONE,
                      "yyyy-MM-dd",
                    );
                    onDateChange(iso);
                  }}
                  initialFocus
                  numberOfMonths={1}
                  disabled={(date) => isWeekend(date)}
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={uiStrings.nextDay}
              onClick={() => onDateShift(1)}
              className="shrink-0"
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Button>
            {showReset && onDateReset && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={uiStrings.today}
                onClick={onDateReset}
                className="shrink-0"
              >
                <RotateCcwIcon className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
          <label className="text-sm font-medium text-muted-foreground">
            {uiStrings.colorModeLabel}
          </label>
          <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {colorModeDisplay}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={colorMode === "objective"}
                aria-label={uiStrings.colorModeToggleAria}
                onClick={handleColorModeToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  colorMode === "objective"
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                    colorMode === "objective"
                      ? "translate-x-5"
                      : "translate-x-1",
                  )}
                />
              </button>
            </div>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
              aria-label={uiStrings.legendLabel}
            >
              {legendItems.map((item) => (
                <span
                  key={`legend-${item.key}`}
                  className="flex items-center gap-2"
                  title={item.description ?? item.label}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-sm border border-border"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium uppercase tracking-wide">
                    {item.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs text-muted-foreground [&>*]:shrink-0">
        <span
          id="filters-heading"
          className="font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {uiStrings.filtersTitle}
        </span>
        <Badge variant="secondary" className="whitespace-nowrap">
          {badgeLabel}
        </Badge>
        <Badge variant="secondary" className="whitespace-nowrap capitalize">
          {formattedDate}
        </Badge>
        <Badge variant="secondary" className="whitespace-nowrap">
          {`${uiStrings.colorModeLabel}: ${colorModeDisplay}`}
        </Badge>
      </div>
    </section>
  );
}

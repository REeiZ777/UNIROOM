"use client";

import { useEffect, useMemo, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  SLOT_DURATION_MINUTES,
  combineDateAndTime,
  generateSlots,
  isWeekend,
  toHHmm,
} from "@/lib/time";
import {
  ReservationInput,
  ReservationInputSchema,
} from "@/lib/validation";
import { createReservation, updateReservation } from "@/server/reservations/actions";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { addMinutes } from "date-fns";
type ReservationMutationResult = Awaited<ReturnType<typeof createReservation>>;

type ReservationFormMode = "create" | "edit";

type ReservationFormProps = {
  rooms: Array<{ id: string; name: string }>;
  defaultValues: ReservationInput;
  reservationId?: string;
  mode?: ReservationFormMode;
  onSuccess?: (reservation: ReservationMutationResult, mode: ReservationFormMode) => void;
  onCancel?: () => void;
};

const uiStrings = {
  objectiveLabel: "Objectif",
  objectiveHelper: "Selectionnez un objectif ou personnalisez le champ ci-dessous.",
  groupLabel: "Groupe / participants",
  groupHelper: "Indiquez les participants prevus dans la salle.",
  roomLabel: "Salle",
  dateLabel: "Date",
  startLabel: "Heure de debut",
  endLabel: "Heure de fin",
  titleLabel: "Titre",
  noteLabel: "Note",
  submitCreate: "Enregistrer la reservation",
  submitUpdate: "Enregistrer les modifications",
  cancel: "Annuler",
  successCreate: "Reservation creee avec succes.",
  successUpdate: "Reservation mise a jour avec succes.",
  errorCreate: "Impossible de creer la reservation.",
  errorUpdate: "Impossible de mettre a jour la reservation.",
  selectPlaceholder: "Choisir...",
} as const;

const objectivePresets = ["Cours", "Examen", "Reunion", "Conference"] as const;
const groupPresets = [
  "L1-SIL/SIRT",
  "L2-SIL",
  "L2-SIRT",
  "L1-DROIT",
  "L2-DROIT",
  "L3-DROIT",
  "L1-AGRO",
  "L2-AGRO",
  "L1 Agro bachelor",
  "L2 Agro bachelor",
  "L1-SEG",
  "L2-SEG",
  "L3-SEG",
  "M1-MOP",
  "M2-MOP",
  "Personne externe",
] as const;

export function ReservationForm({
  rooms,
  defaultValues,
  reservationId,
  mode = "create",
  onSuccess,
  onCancel,
}: ReservationFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  const form = useForm<ReservationInput>({
    resolver: zodResolver<ReservationInput, undefined, ReservationInput>(ReservationInputSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchedDate = form.watch("date");
  const watchedStart = form.watch("start");
  const watchedObjective = form.watch("objective");
  const watchedGroup = form.watch("participantGroup");

  const objectiveSelectValue = useMemo(() => {
    if (!watchedObjective) {
      return "custom";
    }
    const normalized = watchedObjective.trim().toLowerCase();
    const match = objectivePresets.find(
      (preset) => preset.toLowerCase() === normalized,
    );
    return match ?? "custom";
  }, [watchedObjective]);

  const groupSelectValue = useMemo(() => {
    if (!watchedGroup) {
      return "custom";
    }
    const normalized = watchedGroup.trim().toLowerCase();
    const match = groupPresets.find(
      (preset) => preset.toLowerCase() === normalized,
    );
    return match ?? "custom";
  }, [watchedGroup]);

  const slotOptions = useMemo(() => {
    const forDate = combineDateAndTime(
      watchedDate ?? defaultValues.date,
      "00:00",
    );
    return generateSlots(forDate).map(({ start }) => {
      const value = toHHmm(start);
      return { value, label: value };
    });
  }, [watchedDate, defaultValues.date]);

  const endOptions = useMemo(() => {
    const startIndex = slotOptions.findIndex(
      (option) => option.value === watchedStart,
    );
    return slotOptions.slice(startIndex + 1);
  }, [slotOptions, watchedStart]);

  function setEndAfterStart(startValue: string) {
    const startDate = combineDateAndTime(
      watchedDate ?? defaultValues.date,
      startValue,
    );
    const suggestedEnd = toHHmm(addMinutes(startDate, SLOT_DURATION_MINUTES));
    const valid = endOptions.find((option) => option.value === suggestedEnd);
    form.setValue("end", valid?.value ?? endOptions[0]?.value ?? startValue);
  }

  const handleStartChange = (value: string) => {
    form.setValue("start", value);
    setEndAfterStart(value);
  };

  const disabledDates = (date: Date) => {
    return isWeekend(date);
  };

  async function onSubmit(values: ReservationInput) {
    if (isEdit && !reservationId) {
      toast.error(uiStrings.errorUpdate);
      return;
    }

    startTransition(async () => {
      try {
        const saved = (await (
          isEdit && reservationId
            ? updateReservation(reservationId, values)
            : createReservation(values)
        )) as ReservationMutationResult;

        toast.success(isEdit ? uiStrings.successUpdate : uiStrings.successCreate);

        if (isEdit) {
          form.reset(values);
        } else {
          form.reset(defaultValues);
        }

        if (onSuccess) {
          onSuccess(saved, isEdit ? "edit" : "create");
        }
      } catch (error) {
        const fallbackMessage = isEdit ? uiStrings.errorUpdate : uiStrings.errorCreate;
        const message =
          error instanceof Error ? error.message : fallbackMessage;
        toast.error(message);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        data-testid="reservation-form"
      >
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiStrings.roomLabel}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                    <SelectTrigger data-testid="select-room">
                    <SelectValue placeholder={uiStrings.selectPlaceholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{uiStrings.dateLabel}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? field.value : uiStrings.selectPlaceholder}<CalendarIcon className="ml-auto size-4" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        field.value ? new Date(field.value) : new Date(defaultValues.date)
                      }
                      onSelect={(date) => {
                        if (!date || disabledDates(date)) {
                          return;
                        }
                        const iso = date.toISOString().split("T")[0] ?? "";
                        field.onChange(iso);
                      }}
                      disabled={disabledDates}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiStrings.startLabel}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleStartChange(value)}
                  >
                    <FormControl>
                    <SelectTrigger data-testid="select-start">
                        <SelectValue placeholder={uiStrings.selectPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {slotOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiStrings.endLabel}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                    <SelectTrigger data-testid="select-end">
                        <SelectValue placeholder={uiStrings.selectPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {endOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FormLabel>{uiStrings.objectiveLabel}</FormLabel>
                <Select
                  value={objectiveSelectValue}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      form.setValue("objective", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      return;
                    }
                    form.setValue("objective", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="justify-between text-sm">
                      <SelectValue placeholder={uiStrings.selectPlaceholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {objectivePresets.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormDescription>{uiStrings.objectiveHelper}</FormDescription>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex : Cours de mathematiques"
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="participantGroup"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FormLabel>{uiStrings.groupLabel}</FormLabel>
                <Select
                  value={groupSelectValue}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      form.setValue("participantGroup", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      return;
                    }
                    form.setValue("participantGroup", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="justify-between text-sm">
                      <SelectValue placeholder={uiStrings.selectPlaceholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groupPresets.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormDescription>{uiStrings.groupHelper}</FormDescription>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex : L2-SIRT"
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiStrings.titleLabel}</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiStrings.noteLabel}</FormLabel>
              <FormControl>
                <Textarea data-testid="input-note"
                  {...field}
                  value={field.value ?? ""}
                  rows={3}
                  placeholder="Informations complementaires (optionnel)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onCancel}
            >
              {uiStrings.cancel}
            </Button>
          )}
          <Button type="submit" disabled={isPending} data-testid="submit-reservation">
            {isEdit ? uiStrings.submitUpdate : uiStrings.submitCreate}
          </Button>
        </div>
      </form>
    </Form>
  );
}








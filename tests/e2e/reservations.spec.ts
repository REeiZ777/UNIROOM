import { expect, test } from "@playwright/test";
import { PrismaClient, Role } from "@prisma/client";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { hashPassword } from "@/server/security/password";

const prisma = new PrismaClient();
const zone = process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

const credentials = {
  email: "directeur@uniroom.school",
  password: "Admin#12345",
};

const roomName = "A102";
const initialStart = "11:00";
const initialEnd = "11:30";
const updatedStart = "11:30";
const updatedEnd = "12:00";

let roomId: string;
test.beforeAll(async () => {
  const room = await prisma.room.upsert({
    where: { name: roomName },
    update: {},
    create: { name: roomName },
  });
  roomId = room.id;

  await prisma.user.upsert({
    where: { email: credentials.email },
    update: {
      name: "Directeur UNIROOM",
      role: Role.ADMIN,
    },
    create: {
      email: credentials.email,
      name: "Directeur UNIROOM",
      role: Role.ADMIN,
      passwordHash: await hashPassword(credentials.password),
    },
  });

  const todayIso = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${todayIso}T00:00:00`, zone);
  const dayEnd = addDays(dayStart, 1);

  await prisma.reservation.deleteMany({
    where: {
      roomId,
      startTime: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("reservation lifecycle flow", async ({ page }) => {
  const reservationTitle = `Test reservation ${Date.now()}`;
  const reservationNote = `Note generee ${Date.now()}`;

  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Adresse e-mail").fill(credentials.email);
  await page.getByLabel("Mot de passe").fill(credentials.password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await page.waitForURL(/dashboard/);
  await page.goto(`/reservations?room=${encodeURIComponent(roomName)}`);

  await page.getByRole("button", { name: "Nouvelle reservation" }).click();

  await page.getByTestId("select-room").click();
  await page.getByRole("option", { name: roomName }).click();

  await page.getByTestId("select-start").click();
  await page.getByRole("option", { name: initialStart }).click();

  await page.getByTestId("select-end").click();
  await page.getByRole("option", { name: initialEnd }).click();

  await page.getByTestId("input-title").fill(reservationTitle);
  await page
    .getByTestId("input-note")
    .fill(reservationNote);

  await page.getByTestId("submit-reservation").click();
  await expect(
    page.getByText("Reservation creee avec succes."),
  ).toBeVisible();

  const reservationButton = page.getByRole("button", {
    name: reservationTitle,
  });
  await expect(reservationButton).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle reservation" }).click();
  await page.getByTestId("select-room").click();
  await page.getByRole("option", { name: roomName }).click();
  await page.getByTestId("select-start").click();
  await page.getByRole("option", { name: initialStart }).click();
  await page.getByTestId("select-end").click();
  await page.getByRole("option", { name: initialEnd }).click();
  await page.getByTestId("input-title").fill(`Chevauchement ${Date.now()}`);
  await page.getByTestId("submit-reservation").click();

  await expect(
    page.getByText("Ce creneau est deja reserve pour cette salle."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();

  await reservationButton.click();
  await page.getByRole("button", { name: "Modifier" }).click();

  await page.getByTestId("select-start").click();
  await page.getByRole("option", { name: updatedStart }).click();
  await page.getByTestId("select-end").click();
  await page.getByRole("option", { name: updatedEnd }).click();
  await page.getByTestId("submit-reservation").click();

  await expect(
    page.getByText("Reservation mise a jour avec succes."),
  ).toBeVisible();
  await expect(
    page.getByText(`${updatedStart} - ${updatedEnd}`),
  ).toBeVisible();

  await reservationButton.click();
  await page.getByRole("button", { name: "Supprimer" }).click();
  await page
    .getByRole("button", { name: "Supprimer" })
    .last()
    .click();

  await expect(
    page.getByText("Reservation supprimee avec succes."),
  ).toBeVisible();
  await expect(reservationButton).toBeHidden();
});









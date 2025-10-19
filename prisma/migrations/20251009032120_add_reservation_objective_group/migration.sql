-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'Autre',
    "participantGroup" TEXT,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "note" TEXT,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("createdAt", "date", "endTime", "id", "note", "roomId", "startTime", "title", "updatedAt", "userId") SELECT "createdAt", "date", "endTime", "id", "note", "roomId", "startTime", "title", "updatedAt", "userId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE INDEX "Reservation_roomId_date_idx" ON "Reservation"("roomId", "date");
CREATE INDEX "Reservation_roomId_date_startTime_idx" ON "Reservation"("roomId", "date", "startTime");
CREATE UNIQUE INDEX "Reservation_roomId_date_startTime_endTime_title_key" ON "Reservation"("roomId", "date", "startTime", "endTime", "title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

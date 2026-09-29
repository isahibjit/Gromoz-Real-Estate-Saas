-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTimeMinutes" INTEGER NOT NULL,
    "endTimeMinutes" INTEGER NOT NULL,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15,
    "lateThresholdCount" INTEGER NOT NULL DEFAULT 3,
    "latePenaltyStatus" TEXT NOT NULL DEFAULT 'Half Day',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "EmployeeProfile"
ADD COLUMN "shiftId" TEXT;

-- AlterTable
ALTER TABLE "AttendanceRecord"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'PUNCH',
ADD COLUMN "shiftId" TEXT,
ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lateSequenceInMonth" INTEGER,
ADD COLUMN "derivedStatusReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_name_key" ON "ShiftTemplate"("name");

-- AddForeignKey
ALTER TABLE "EmployeeProfile"
ADD CONSTRAINT "EmployeeProfile_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord"
ADD CONSTRAINT "AttendanceRecord_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

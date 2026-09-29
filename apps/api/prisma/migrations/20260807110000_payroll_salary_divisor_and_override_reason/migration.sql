ALTER TABLE "PayrollRecord"
ADD COLUMN "salaryDivisorDays" DECIMAL(65,30) NOT NULL DEFAULT 30,
ADD COLUMN "manualOverrideReason" TEXT;

UPDATE "PayrollRecord"
SET "salaryDivisorDays" = "payableDays"
WHERE "salaryDivisorDays" = 30;

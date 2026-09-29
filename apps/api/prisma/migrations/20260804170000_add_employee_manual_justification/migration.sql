ALTER TABLE "EmployeeProfile"
ADD COLUMN "justificationMode" TEXT NOT NULL DEFAULT 'MULTIPLIER',
ADD COLUMN "justificationAmount" DECIMAL(65,30);

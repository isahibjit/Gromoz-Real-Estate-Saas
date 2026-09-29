-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PayrollSetting" (
    "id" TEXT NOT NULL,
    "workingDays" INTEGER[],
    "divisorType" TEXT NOT NULL DEFAULT 'FIXED',
    "fixedDivisor" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSetting_pkey" PRIMARY KEY ("id")
);

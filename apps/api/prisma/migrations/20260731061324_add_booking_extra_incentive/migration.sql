-- CreateTable
CREATE TABLE "BookingExtraIncentive" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingExtraIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingExtraIncentive_bookingId_idx" ON "BookingExtraIncentive"("bookingId");

-- CreateIndex
CREATE INDEX "BookingExtraIncentive_recipientUserId_idx" ON "BookingExtraIncentive"("recipientUserId");

-- AddForeignKey
ALTER TABLE "BookingExtraIncentive" ADD CONSTRAINT "BookingExtraIncentive_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingExtraIncentive" ADD CONSTRAINT "BookingExtraIncentive_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingExtraIncentive" ADD CONSTRAINT "BookingExtraIncentive_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

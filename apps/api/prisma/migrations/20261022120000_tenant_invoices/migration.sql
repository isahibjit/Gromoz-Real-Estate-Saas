-- AlterTable
ALTER TABLE "BillingTransaction" ADD COLUMN     "invoiceId" TEXT;

-- CreateTable
CREATE TABLE "PlatformInvoiceSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "businessName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "previewedAt" TIMESTAMP(3),
    "enabledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "obligationKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "amountMinor" DECIMAL(18,0) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "snapshot" JSONB NOT NULL,
    "seatQuantity" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "replacesNumber" TEXT,
    "voidReason" TEXT,
    "reconciliationNote" TEXT,
    "historical" BOOLEAN NOT NULL DEFAULT false,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCheckoutAttempt" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentLinkId" TEXT,
    "paymentLinkUrl" TEXT,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "InvoiceCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDelivery" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceBackfillRun" (
    "code" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "settingsFingerprint" TEXT NOT NULL,
    "cursor" TEXT,
    "created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceBackfillRun_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_number_key" ON "BillingInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_obligationKey_key" ON "BillingInvoice"("obligationKey");

-- CreateIndex
CREATE INDEX "BillingInvoice_organizationId_issuedAt_idx" ON "BillingInvoice"("organizationId", "issuedAt");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_dueAt_idx" ON "BillingInvoice"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCheckoutAttempt_orderId_key" ON "InvoiceCheckoutAttempt"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCheckoutAttempt_paymentLinkId_key" ON "InvoiceCheckoutAttempt"("paymentLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCheckoutAttempt_paymentId_key" ON "InvoiceCheckoutAttempt"("paymentId");

-- CreateIndex
CREATE INDEX "InvoiceCheckoutAttempt_invoiceId_createdAt_idx" ON "InvoiceCheckoutAttempt"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_status_nextAttemptAt_idx" ON "InvoiceDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceDelivery_invoiceId_kind_recipient_key" ON "InvoiceDelivery"("invoiceId", "kind", "recipient");

-- CreateIndex
CREATE INDEX "InvoiceBackfillRun_status_idx" ON "InvoiceBackfillRun"("status");

-- CreateIndex
CREATE INDEX "BillingTransaction_invoiceId_idx" ON "BillingTransaction"("invoiceId");

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCheckoutAttempt" ADD CONSTRAINT "InvoiceCheckoutAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


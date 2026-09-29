CREATE TABLE "LoginOtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "identifierHash" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "requestIp" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoginOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginOtpChallenge_userId_idx" ON "LoginOtpChallenge"("userId");
CREATE INDEX "LoginOtpChallenge_expiresAt_idx" ON "LoginOtpChallenge"("expiresAt");
CREATE INDEX "LoginOtpChallenge_identifierHash_idx" ON "LoginOtpChallenge"("identifierHash");

ALTER TABLE "LoginOtpChallenge"
ADD CONSTRAINT "LoginOtpChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

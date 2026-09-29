CREATE TABLE "MobileAppRelease" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionName" TEXT NOT NULL,
  "buildNumber" INTEGER NOT NULL CHECK ("buildNumber" > 0),
  "originalName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL UNIQUE,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "releaseNotes" TEXT NOT NULL DEFAULT '',
  "uploaderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3)
);
CREATE INDEX "MobileAppRelease_createdAt_idx" ON "MobileAppRelease"("createdAt");
CREATE TABLE "MobileAppPublication" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'android' CHECK ("id" = 'android'),
  "releaseId" TEXT UNIQUE REFERENCES "MobileAppRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "MobileAppPublication" ("id") VALUES ('android');

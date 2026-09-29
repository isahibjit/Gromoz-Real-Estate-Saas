-- CreateTable
CREATE TABLE "UserRankingTeamAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRankingTeamAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRankingTeamAccess_userId_teamId_key" ON "UserRankingTeamAccess"("userId", "teamId");

-- CreateIndex
CREATE INDEX "UserRankingTeamAccess_userId_idx" ON "UserRankingTeamAccess"("userId");

-- CreateIndex
CREATE INDEX "UserRankingTeamAccess_teamId_idx" ON "UserRankingTeamAccess"("teamId");

-- AddForeignKey
ALTER TABLE "UserRankingTeamAccess" ADD CONSTRAINT "UserRankingTeamAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankingTeamAccess" ADD CONSTRAINT "UserRankingTeamAccess_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankingTeamAccess" ADD CONSTRAINT "UserRankingTeamAccess_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

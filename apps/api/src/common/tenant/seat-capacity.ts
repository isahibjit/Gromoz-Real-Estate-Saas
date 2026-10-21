import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';

/** Serialize seat-consuming writes for a workspace, including pending invitations. */
export async function withSeatCapacity<T>(
  prisma: PrismaService,
  organizationId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { allocatedSeats: true, pricePerSeatMonth: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const [activeMembersCount, pendingInvitations] = await Promise.all([
      tx.organizationMember.count({
        where: { organizationId, isActive: true },
      }),
      tx.organizationInvitation.count({
        where: {
          organizationId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
    if (activeMembersCount + pendingInvitations >= org.allocatedSeats) {
      throw new BadRequestException({
        code: 'SEAT_LIMIT_REACHED',
        message:
          'Your workspace has no available seats. Add seats to continue.',
        allocatedSeats: org.allocatedSeats,
        activeMembersCount,
        pendingInvitations,
        pricePerSeatMonth: org.pricePerSeatMonth,
      });
    }
    return work(tx);
  });
}

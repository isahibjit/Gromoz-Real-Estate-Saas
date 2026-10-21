import { BadRequestException } from '@nestjs/common';
export function dateRange(from?: string, to?: string) {
  if (from && to && new Date(from) > new Date(to))
    throw new BadRequestException('Start date must be before end date');
  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to
      ? { lte: new Date(to.length === 10 ? `${to}T23:59:59.999Z` : to) }
      : {}),
  };
}

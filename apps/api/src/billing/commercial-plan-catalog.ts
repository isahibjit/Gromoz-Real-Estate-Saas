import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ServiceUnavailableException } from '@nestjs/common';
export interface WorkspacePlan {
  code: string;
  name: string;
  description: string;
}
/** The same platform-managed catalog used by OrganizationService. Prices remain workspace-specific. */
export function configuredWorkspacePlans(): WorkspacePlan[] {
  const file = join(process.cwd(), 'storage', 'commercial_plans.json');
  if (!existsSync(file)) return [];
  let values: unknown;
  try {
    values = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new ServiceUnavailableException(
      'Plan catalog is temporarily unavailable',
    );
  }
  if (!Array.isArray(values))
    throw new ServiceUnavailableException(
      'Plan catalog is temporarily unavailable',
    );
  return values.flatMap((value: unknown) => {
    if (
      !value ||
      typeof value !== 'object' ||
      !('code' in value) ||
      !('name' in value) ||
      !('status' in value) ||
      value.status !== 'Active' ||
      typeof value.code !== 'string' ||
      typeof value.name !== 'string'
    )
      return [];
    return [
      {
        code: value.code,
        name: value.name,
        description:
          'description' in value && typeof value.description === 'string'
            ? value.description
            : '',
      },
    ];
  });
}

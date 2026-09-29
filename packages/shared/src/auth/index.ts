import { z } from "zod";

export const UserRoleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "HR",
  "SALES_MANAGER",
  "TEAM_LEADER",
  "MANAGER",
  "SALES_AGENT",
  "TELECALLER",
  "MARKETING",
  "BACKEND",
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export function getUserRoleLabel(role?: string | null) {
  if (!role) return "-";
  if (role === "TELECALLER") return "Pre Sales";
  if (
    role === "BACKEND" ||
    role === "BACKOFFICE" ||
    role === "BACK_END_EXECUTIVE" ||
    role === "BACKEND_EXECUTIVE"
  ) {
    return "Back-End Executive";
  }
  if (role === "SALES_AGENT" || role === "FIELD_EXECUTIVE") {
    return "Field Executive";
  }
  if (role === "TEAM_LEADER") return "Team Leader";
  if (role === "SALES_MANAGER") return "Sales Manager";
  if (role === "SUPER_ADMIN") return "Super Admin";
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const ModulePermissionSchema = z.object({
  moduleKey: z.string(),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canPunchIn: z.boolean().default(false),
  canPunchOut: z.boolean().default(false),
});

export type ModulePermission = z.infer<typeof ModulePermissionSchema>;

export const LoginLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().nonnegative(),
});

export const LoginSchema = z
  .object({
    email: z.string().trim().email().optional(),
    mobile: z.string().trim().min(8).optional(),
    password: z.string().min(1),
    location: LoginLocationSchema.optional(),
  })
  .refine((value) => Boolean(value.email || value.mobile), {
    message: "Email or mobile number is required",
    path: ["email"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;

export const LoginOtpRequestSchema = z.object({
  identifier: z.string().trim().min(3, "Email or mobile number is required"),
});

export type LoginOtpRequestInput = z.infer<typeof LoginOtpRequestSchema>;

export const LoginOtpVerifySchema = z.object({
  location: LoginLocationSchema.optional(),
  identifier: z.string().trim().min(3, "Email or mobile number is required"),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit OTP"),
});

export type LoginOtpVerifyInput = z.infer<typeof LoginOtpVerifySchema>;

export const LoginOtpRequestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  expiresInSeconds: z.number(),
  resendAfterSeconds: z.number(),
  deliveryTarget: z.string().optional(),
});

export type LoginOtpRequestResponse = z.infer<
  typeof LoginOtpRequestResponseSchema
>;

export const PasswordLoginOtpRequiredSchema = LoginOtpRequestResponseSchema.extend({
  requiresOtp: z.literal(true),
  identifier: z.string(),
});

export type PasswordLoginOtpRequired = z.infer<
  typeof PasswordLoginOtpRequiredSchema
>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: UserRoleSchema,
    fullName: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    permissions: z.array(ModulePermissionSchema).default([]),
  }),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const LoginResponseSchema = z.union([
  AuthTokensSchema,
  PasswordLoginOtpRequiredSchema,
]);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const JwtUserSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
});

export type JwtUser = z.infer<typeof JwtUserSchema>;

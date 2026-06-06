import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email.");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "The OTP code must be 6 digits.");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

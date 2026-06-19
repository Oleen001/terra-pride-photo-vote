import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email.");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

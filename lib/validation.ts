import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("กรุณากรอกอีเมลให้ถูกต้อง");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "รหัส OTP ต้องเป็นตัวเลข 6 หลัก");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

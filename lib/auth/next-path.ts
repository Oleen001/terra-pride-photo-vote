export function safeLoginNextPath(value: FormDataEntryValue | string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = String(raw ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return "/";

  const [pathname] = next.split(/[?#]/);
  if (pathname === "/login" || pathname === "/login/success" || pathname === "/admin/login") return "/";

  return next;
}

/**
 * Team roles and what each may do in the workspace. Enforced across the desk's controls for the member
 * currently acting (top bar). These are workspace roles on this device; they are not server-side accounts.
 */
export type Role = "owner" | "admin" | "operator" | "viewer";
export type Permission = "run" | "approve" | "calibrate" | "settings" | "members" | "license";

export const ROLES: Role[] = ["owner", "admin", "operator", "viewer"];

const GRANTS: Record<Role, Permission[]> = {
  owner: ["run", "approve", "calibrate", "settings", "members", "license"],
  admin: ["run", "approve", "calibrate", "settings", "members"],
  operator: ["run", "approve"],
  viewer: [],
};

export const ROLE_INFO: Record<Role, { label: string; blurb: string }> = {
  owner: { label: "Owner", blurb: "Everything, including the license." },
  admin: { label: "Admin", blurb: "Runs, calibration, settings and team; not the license." },
  operator: { label: "Operator", blurb: "Runs engines and approves actions." },
  viewer: { label: "Viewer", blurb: "Read-only: watches runs and reports." },
};

export const can = (role: Role, p: Permission) => GRANTS[role].includes(p);

const ROLE_TEXT: Record<"es" | "he", Record<Role, { label: string; blurb: string }>> = {
  es: {
    owner: { label: "Propietario", blurb: "Todo, incluida la licencia." },
    admin: { label: "Administrador", blurb: "Ejecuciones, calibración, ajustes y equipo; no la licencia." },
    operator: { label: "Operador", blurb: "Ejecuta motores y aprueba acciones." },
    viewer: { label: "Observador", blurb: "Solo lectura: sigue las ejecuciones y los informes." },
  },
  he: {
    owner: { label: "בעלים", blurb: "הכול, כולל הרישיון." },
    admin: { label: "מנהל", blurb: "הרצות, כיול, הגדרות וצוות; לא הרישיון." },
    operator: { label: "מפעיל", blurb: "מריץ מנועים ומאשר פעולות." },
    viewer: { label: "צופה", blurb: "קריאה בלבד: עוקב אחרי הרצות ודוחות." },
  },
};

/** ROLE_INFO in the given language. */
export const roleInfo = (lang: "en" | "es" | "he"): Record<Role, { label: string; blurb: string }> => (lang === "en" ? ROLE_INFO : ROLE_TEXT[lang]);

/** Permission names in each language. */
export const PERMISSION_TEXT: Record<"en" | "es" | "he", Record<Permission, string>> = {
  en: { run: "run", approve: "approve", calibrate: "calibrate", settings: "settings", members: "members", license: "license" },
  es: { run: "ejecutar", approve: "aprobar", calibrate: "calibrar", settings: "ajustes", members: "miembros", license: "licencia" },
  he: { run: "הרצה", approve: "אישור", calibrate: "כיול", settings: "הגדרות", members: "חברי צוות", license: "רישיון" },
};

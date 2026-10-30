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

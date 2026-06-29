export type Role = "admin" | "project_manager" | "team_member" | "client" | "auditor";

export const canManageLeads = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canViewFinancials = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canManageUsers = (role: Role) => role === "admin";

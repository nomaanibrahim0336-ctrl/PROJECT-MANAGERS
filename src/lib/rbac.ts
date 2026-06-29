export type Role = "admin" | "project_manager" | "team_member" | "client" | "auditor";

export const canManageLeads = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canViewFinancials = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canManageUsers = (role: Role) => role === "admin";

export const canManageServiceCatalog = (role: Role) => role === "admin";

export const canCreateTicket = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canForwardOrAssignRevision = (role: Role) =>
  role === "admin" || role === "project_manager";

export const canMarkReadyForReview = (role: Role) =>
  role === "admin" || role === "project_manager" || role === "team_member";

export const canManageMembers = (role: Role) => role === "admin";

export const canViewAuditLogs = (role: Role) => role === "admin";

export type Role = "super_admin" | "admin" | "project_manager" | "team_member" | "client" | "auditor";

const isAdmin = (role: Role) => role === "super_admin" || role === "admin";

export const canManageLeads = (role: Role) =>
  isAdmin(role) || role === "project_manager";

export const canViewFinancials = (role: Role) =>
  isAdmin(role) || role === "project_manager";

export const canManageUsers = (role: Role) => isAdmin(role);

export const canManageServiceCatalog = (role: Role) => isAdmin(role);

export const canCreateTicket = (role: Role) =>
  isAdmin(role) || role === "project_manager";

export const canForwardOrAssignRevision = (role: Role) =>
  isAdmin(role) || role === "project_manager";

export const canMarkReadyForReview = (role: Role) =>
  isAdmin(role) || role === "project_manager" || role === "team_member";

export const canManageMembers = (role: Role) => isAdmin(role);

export const canViewAuditLogs = (role: Role) => isAdmin(role);

export const canViewPmPanel = (role: Role) =>
  isAdmin(role) || role === "project_manager";

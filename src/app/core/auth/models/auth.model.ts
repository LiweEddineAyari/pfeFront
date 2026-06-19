/**
 * Auth / RBAC domain models shared across the auth core and the
 * profile / admin management screens.
 */

export type Role = 'ROLE_ADMIN' | 'ROLE_TECH' | 'ROLE_FINANCE';

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING';

export type SignupStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Subset of Keycloak JWT claims we read on the client. */
export interface JwtClaims {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
  iat?: number;
  realm_access?: { roles?: string[] };
  [claim: string]: unknown;
}

/** Authenticated identity derived from the decoded access token. */
export interface AuthUser {
  sub: string;
  username: string;
  email: string;
  fullName: string;
  roles: Role[];
}

/** Raw token response from the Keycloak token endpoint. */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
  scope?: string;
}

// ── Public auth surface ───────────────────────────────────────────────────────

export interface SignupRequestDTO {
  username: string;
  email: string;
  fullName: string;
  password: string;
  requestedRole: Role;
}

export interface ForgotPasswordVerifyResponse {
  verified: boolean;
  resetTicket: string | null;
}

export interface MessageResponse {
  message: string;
}

// ── Profile (/me) ─────────────────────────────────────────────────────────────

export interface ProfileResponse {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  roles: Role[];
}

export interface UpdateProfileRequest {
  email?: string;
  fullName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ── Admin: users ──────────────────────────────────────────────────────────────

export interface UserResponse {
  keycloakUserId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: UserStatus;
  realmRoles: string[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  role: string;
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: string;
}

// ── Admin: roles & permissions ────────────────────────────────────────────────

export interface PermissionResponse {
  id: number;
  httpMethod: string;
  pathPattern: string;
  description: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  description: string;
  system: boolean;
  permissions: PermissionResponse[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
}

// ── Admin: signup approvals ───────────────────────────────────────────────────

export interface SignupRequestResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  requestedRole: string;
  status: SignupStatus;
  createdAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrateur',
  ROLE_TECH: 'Technique / IT',
  ROLE_FINANCE: 'Finance',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABELS[role] ?? role.replace(/^ROLE_/, '');
}

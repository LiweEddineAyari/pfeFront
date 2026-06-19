import { Injectable } from '@angular/core';
import {
  ChangePasswordRequest,
  CreateRoleRequest,
  CreateUserRequest,
  ForgotPasswordVerifyResponse,
  MessageResponse,
  PermissionResponse,
  ProfileResponse,
  Role,
  RoleResponse,
  SignupRequestDTO,
  SignupRequestResponse,
  UpdateProfileRequest,
  UpdateUserRequest,
  UserResponse,
} from './models/auth.model';

export interface FinanceUserDto {
  keycloakUserId: string;
  email: string;
  fullName: string;
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/**
 * Typed access to the backend auth surface (`/auth/**`, `/me/**`, `/admin/**`),
 * proxied under `/api`. Uses native `fetch` (house style) so the global auth
 * wrapper attaches the bearer token automatically.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly base = '/api';

  // ── public auth ───────────────────────────────────────────────────────────────

  selectableRoles(): Promise<Role[]> {
    return this.request<Role[]>('GET', '/auth/roles');
  }

  signup(payload: SignupRequestDTO): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', '/auth/signup', payload);
  }

  forgotPassword(email: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', '/auth/password/forgot', { email });
  }

  verifyOtp(email: string, otp: string): Promise<ForgotPasswordVerifyResponse> {
    return this.request<ForgotPasswordVerifyResponse>('POST', '/auth/password/verify', {
      email,
      otp,
    });
  }

  resetPassword(resetTicket: string, newPassword: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', '/auth/password/reset', {
      resetTicket,
      newPassword,
    });
  }

  // ── profile (/me) ─────────────────────────────────────────────────────────────

  getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('GET', '/me');
  }

  updateProfile(payload: UpdateProfileRequest): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('PUT', '/me', payload);
  }

  changePassword(payload: ChangePasswordRequest): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', '/me/change-password', payload);
  }

  // ── admin: users ────────────────────────────────────────────────────────────────

  listUsers(first = 0, max = 100): Promise<UserResponse[]> {
    return this.request<UserResponse[]>('GET', `/admin/users?first=${first}&max=${max}`);
  }

  createUser(payload: CreateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('POST', '/admin/users', payload);
  }

  updateUser(id: string, payload: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('PUT', `/admin/users/${encodeURIComponent(id)}`, payload);
  }

  deleteUser(id: string): Promise<void> {
    return this.request<void>('DELETE', `/admin/users/${encodeURIComponent(id)}`);
  }

  blockUser(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', `/admin/users/${encodeURIComponent(id)}/block`);
  }

  unblockUser(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('POST', `/admin/users/${encodeURIComponent(id)}/unblock`);
  }

  /** Lists active FINANCE users. Available to both ADMIN and TECH via GET /users/finance. */
  listFinanceUsers(): Promise<FinanceUserDto[]> {
    return this.request<FinanceUserDto[]>('GET', '/users/finance');
  }

  // ── admin: roles & permissions ────────────────────────────────────────────────

  listRoles(): Promise<RoleResponse[]> {
    return this.request<RoleResponse[]>('GET', '/admin/roles');
  }

  createRole(payload: CreateRoleRequest): Promise<RoleResponse> {
    return this.request<RoleResponse>('POST', '/admin/roles', payload);
  }

  deleteRole(id: number): Promise<void> {
    return this.request<void>('DELETE', `/admin/roles/${id}`);
  }

  listPermissions(): Promise<PermissionResponse[]> {
    return this.request<PermissionResponse[]>('GET', '/admin/permissions');
  }

  assignPermissions(roleId: number, permissionIds: number[]): Promise<RoleResponse> {
    return this.request<RoleResponse>('POST', `/admin/roles/${roleId}/permissions`, {
      permissionIds,
    });
  }

  // ── admin: signup approvals ───────────────────────────────────────────────────

  listSignupRequests(): Promise<SignupRequestResponse[]> {
    return this.request<SignupRequestResponse[]>('GET', '/admin/signup-requests');
  }

  approveSignup(id: number): Promise<SignupRequestResponse> {
    return this.request<SignupRequestResponse>('POST', `/admin/signup-requests/${id}/approve`);
  }

  rejectSignup(id: number): Promise<SignupRequestResponse> {
    return this.request<SignupRequestResponse>('POST', `/admin/signup-requests/${id}/reject`);
  }

  // ── transport ─────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new AuthApiError(0, 'Le serveur est injoignable. Réessayez plus tard.');
    }

    const text = await res.text();
    const payload = text ? this.tryParse(text) : null;

    if (!res.ok) {
      throw new AuthApiError(res.status, this.errorMessage(res.status, payload));
    }

    return payload as T;
  }

  private tryParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private errorMessage(status: number, payload: unknown): string {
    if (payload && typeof payload === 'object') {
      const msg = (payload as Record<string, unknown>)['message'];
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (typeof payload === 'string' && payload.trim()) return payload;

    switch (status) {
      case 400:
        return 'Requête invalide. Vérifiez les champs saisis.';
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return "Vous n'avez pas les droits nécessaires pour cette action.";
      case 404:
        return 'Ressource introuvable.';
      case 409:
        return 'Conflit : cet utilisateur ou cet e-mail existe déjà.';
      case 429:
        return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
      default:
        return `La requête a échoué (HTTP ${status}).`;
    }
  }
}

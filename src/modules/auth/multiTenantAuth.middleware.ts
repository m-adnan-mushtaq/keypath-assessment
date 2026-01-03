import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';
import { roleRights } from '../../config/roles';

/**
 * Multi-tenant authentication middleware
 * Reads headers: x-user-id, x-org-id, x-role
 * This simulates JWT/Auth0/Clerk authentication for the technical test
 */
export const multiTenantAuth = () => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const orgId = req.headers['x-org-id'] as string;
    const role = req.headers['x-role'] as string;

    if (!userId || !orgId || !role) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        'Missing required auth headers: x-user-id, x-org-id, x-role'
      );
    }

    if (!['tenant', 'landlord', 'admin'].includes(role)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid role. Must be: tenant, landlord, or admin');
    }

    // Attach user and org context to request
    // Cast to any to avoid type conflicts with existing auth
    req.user = {
      id: userId,
      role: role as 'tenant' | 'landlord' | 'admin',
    } as any;
    req.orgId = orgId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify required rights middleware
 * @param requiredRights - Array of required rights
 */
export const authorize = (...requiredRights: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (requiredRights.length) {
    if (!req.user || !('role' in req.user)) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated'));
    }
    const userRights = roleRights.get(req.user.role) || [];
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));

    if (!hasRequiredRights) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }
  }
  next();
};

/**
 * Ensure org scoping - prevents cross-org data access
 * This should be used in services to filter queries by orgId
 */
export const getOrgFilter = (req: Request): { orgId: string } => {
  return { orgId: req.orgId as string };
};

/**
 * Check if user has access to specific tenant
 * Tenants can only access their own data
 */
export const canAccessTenant = (req: Request, tenantId: string): boolean => {
  if (!req.user || !('role' in req.user)) {
    return false;
  }
  
  // Admins and landlords can access any tenant in their org
  if (req.user.role === 'admin' || req.user.role === 'landlord') {
    return true;
  }
  
  // Tenants can only access their own data
  return req.user.id === tenantId;
};



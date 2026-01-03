import httpStatus from 'http-status';
import Tenant from './tenant.model';
import ApiError from '../errors/ApiError';
import { ITenantDoc } from './tenant.interfaces';
import * as unitService from '../unit/unit.service';

/**
 * Create a tenant
 * @param {string} orgId - Organization ID  
 * @param {string} unitId - Unit ID
 * @param {Object} tenantBody - Tenant data
 * @returns {Promise<ITenantDoc>}
 */
export const createTenant = async (orgId: string, unitId: string, tenantBody: any): Promise<ITenantDoc> => {
  // Verify unit exists and belongs to org
  await unitService.getUnitById(unitId, orgId);
  
  // Check if user already has a tenant profile
  const existingTenant = await Tenant.findOne({ userId: tenantBody.userId });
  if (existingTenant) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a tenant profile');
  }
  
  const tenant = await Tenant.create({
    ...tenantBody,
    unitId,
    orgId,
  });
  return tenant;
};

/**
 * Get tenant profile by user ID (for /tenants/me endpoint)
 * @param {string} userId - User ID from auth context
 * @param {string} orgId - Organization ID
 * @returns {Promise<ITenantDoc | null>}
 */
export const getTenantByUserId = async (userId: string, orgId: string): Promise<ITenantDoc | null> => {
  const tenant = await Tenant.findOne({ userId, orgId }).populate('unitId');
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant profile not found');
  }
  return tenant;
};

/**
 * Get tenant by ID with org scoping
 * @param {string} tenantId - Tenant ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<ITenantDoc | null>}
 */
export const getTenantById = async (tenantId: string, orgId: string): Promise<ITenantDoc | null> => {
  const tenant = await Tenant.findOne({ _id: tenantId, orgId });
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }
  return tenant;
};

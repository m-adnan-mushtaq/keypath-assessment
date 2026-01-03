import httpStatus from 'http-status';
import Unit from './unit.model';
import ApiError from '../errors/ApiError';
import { IUnitDoc } from './unit.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import * as propertyService from '../property/property.service';

/**
 * Create a unit
 * @param {string} orgId - Organization ID  
 * @param {string} propertyId - Property ID
 * @param {Object} unitBody - Unit data
 * @returns {Promise<IUnitDoc>}
 */
export const createUnit = async (orgId: string, propertyId: string, unitBody: any): Promise<IUnitDoc> => {
  // Verify property exists and belongs to org
  await propertyService.getPropertyById(propertyId, orgId);
  
  const unit = await Unit.create({
    ...unitBody,
    propertyId,
  });
  return unit;
};

/**
 * Query for units with org scoping
 * @param {string} orgId - Organization ID
 * @param {string} propertyId - Property ID
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryUnits = async (orgId: string, propertyId: string, options: IOptions): Promise<QueryResult> => {
  // Verify property belongs to org
  await propertyService.getPropertyById(propertyId, orgId);
  
  const units = await Unit.paginate({ propertyId }, options);
  return units;
};

/**
 * Get unit by id with org scoping
 * @param {string} id - Unit id
 * @param {string} orgId - Organization ID
 * @returns {Promise<IUnitDoc | null>}
 */
export const getUnitById = async (id: string, orgId: string): Promise<IUnitDoc | null> => {
  const unit = await Unit.findById(id).populate('propertyId');
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  
  // Verify the unit's property belongs to the org
  const property: any = unit.propertyId;
  if (property.orgId !== orgId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  
  return unit;
};

/**
 * Update unit by id with org scoping
 * @param {string} unitId - Unit id
 * @param {string} orgId - Organization ID
 * @param {Object} updateBody - Update data
 * @returns {Promise<IUnitDoc | null>}
 */
export const updateUnitById = async (
  unitId: string,
  orgId: string,
  updateBody: Partial<IUnitDoc>
): Promise<IUnitDoc | null> => {
  const unit = await getUnitById(unitId, orgId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  Object.assign(unit, updateBody);
  await unit.save();
  return unit;
};

/**
 * Delete unit by id with org scoping
 * @param {string} unitId - Unit id
 * @param {string} orgId - Organization ID
 * @returns {Promise<IUnitDoc | null>}
 */
export const deleteUnitById = async (unitId: string, orgId: string): Promise<IUnitDoc | null> => {
  const unit = await getUnitById(unitId, orgId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  await unit.deleteOne();
  return unit;
};

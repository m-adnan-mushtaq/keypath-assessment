import httpStatus from 'http-status';
import Property from './property.model';
import ApiError from '../errors/ApiError';
import { IPropertyDoc } from './property.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';

/**
 * Create a property
 * @param {string} orgId - Organization ID
 * @param {Object} propertyBody - Property data
 * @returns {Promise<IPropertyDoc>}
 */
export const createProperty = async (orgId: string, propertyBody: any): Promise<IPropertyDoc> => {
  const property = await Property.create({
    ...propertyBody,
    orgId,
  });
  return property;
};

/**
 * Query for properties with org scoping
 * @param {string} orgId - Organization ID
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryProperties = async (
  orgId: string,
  filter: Record<string, any>,
  options: IOptions
): Promise<QueryResult> => {
  // Ensure org scoping
  const orgFilter = { ...filter, orgId };
  const properties = await Property.paginate(orgFilter, options);
  return properties;
};

/**
 * Get property by id with org scoping
 * @param {string} id - Property id
 * @param {string} orgId - Organization ID
 * @returns {Promise<IPropertyDoc | null>}
 */
export const getPropertyById = async (id: string, orgId: string): Promise<IPropertyDoc | null> => {
  const property = await Property.findOne({ _id: id, orgId });
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Property not found');
  }
  return property;
};

/**
 * Update property by id with org scoping
 * @param {string} propertyId - Property id
 * @param {string} orgId - Organization ID
 * @param {Object} updateBody - Update data
 * @returns {Promise<IPropertyDoc | null>}
 */
export const updatePropertyById = async (
  propertyId: string,
  orgId: string,
  updateBody: Partial<IPropertyDoc>
): Promise<IPropertyDoc | null> => {
  const property = await getPropertyById(propertyId, orgId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Property not found');
  }
  Object.assign(property, updateBody);
  await property.save();
  return property;
};

/**
 * Delete property by id with org scoping
 * @param {string} propertyId - Property id
 * @param {string} orgId - Organization ID
 * @returns {Promise<IPropertyDoc | null>}
 */
export const deletePropertyById = async (propertyId: string, orgId: string): Promise<IPropertyDoc | null> => {
  const property = await getPropertyById(propertyId, orgId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Property not found');
  }
  await property.deleteOne();
  return property;
};

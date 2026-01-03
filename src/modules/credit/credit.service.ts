import httpStatus from 'http-status';
import mongoose from 'mongoose';
import CreditTransaction from './credit.model';
import { ApiError } from '../errors';
import { ICreditTransactionDoc, CreditTransactionType } from './credit.interfaces';
import * as tenantService from '../tenant/tenant.service';
import { IOptions } from '../paginate/paginate';

/**
 * Get tenant balance (sum of all transaction amounts)
 * @param {string} tenantId
 * @param {string} orgId
 * @returns {Promise<number>}
 */
export const getTenantBalance = async (tenantId: string, orgId: string): Promise<number> => {
  const result = await CreditTransaction.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        orgId,
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].balance : 0;
};

/**
 * Earn credits for a tenant
 * @param {string} orgId
 * @param {string} tenantId
 * @param {number} amount
 * @param {string} [memo]
 * @returns {Promise<ICreditTransactionDoc>}
 */
export const earnCredit = async (
  orgId: string,
  tenantId: string,
  amount: number,
  memo?: string
): Promise<ICreditTransactionDoc> => {
  // Verify tenant exists and belongs to org
  const tenant = await tenantService.getTenantById(tenantId, orgId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  const transaction = await CreditTransaction.create({
    orgId,
    tenantId,
    unitId: tenant.unitId,
    type: CreditTransactionType.EARN,
    amount,
    memo,
  });

  return transaction;
};

/**
 * Redeem credits for a tenant
 * @param {string} orgId
 * @param {string} tenantId
 * @param {number} amount
 * @param {string} [memo]
 * @returns {Promise<ICreditTransactionDoc>}
 */
export const redeemCredit = async (
  orgId: string,
  tenantId: string,
  amount: number,
  memo?: string
): Promise<ICreditTransactionDoc> => {
  // Verify tenant exists and belongs to org
  const tenant = await tenantService.getTenantById(tenantId, orgId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  // Check balance
  const balance = await getTenantBalance(tenantId, orgId);
  if (balance < amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient balance. Current balance: ${balance}, Requested: ${amount}`);
  }

  // Create REDEEM transaction with negative amount
  const transaction = await CreditTransaction.create({
    orgId,
    tenantId,
    unitId: tenant.unitId,
    type: CreditTransactionType.REDEEM,
    amount: -amount,
    memo,
  });

  return transaction;
};

/**
 * Adjust credits for a tenant (correction transaction)
 * @param {string} orgId
 * @param {string} tenantId
 * @param {number} amount - Can be positive or negative
 * @param {string} [memo]
 * @returns {Promise<ICreditTransactionDoc>}
 */
export const adjustCredit = async (
  orgId: string,
  tenantId: string,
  amount: number,
  memo?: string
): Promise<ICreditTransactionDoc> => {
  // Verify tenant exists and belongs to org
  const tenant = await tenantService.getTenantById(tenantId, orgId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  const transaction = await CreditTransaction.create({
    orgId,
    tenantId,
    unitId: tenant.unitId,
    type: CreditTransactionType.ADJUST,
    amount,
    memo,
  });

  return transaction;
};

/**
 * Query tenant credit ledger
 * @param {string} tenantId
 * @param {string} orgId
 * @param {IOptions} options
 * @returns {Promise<any>}
 */
export const getTenantLedger = async (tenantId: string, orgId: string, options: IOptions): Promise<any> => {
  const tenant = await tenantService.getTenantById(tenantId, orgId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  const result = await CreditTransaction.paginate(
    { tenantId, orgId },
    {
      ...options,
      sortBy: options.sortBy || 'createdAt:desc',
    }
  );

  return result;
};

export default {
  getTenantBalance,
  earnCredit,
  redeemCredit,
  adjustCredit,
  getTenantLedger,
};

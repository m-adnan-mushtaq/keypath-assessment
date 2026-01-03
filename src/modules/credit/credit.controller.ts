import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import * as creditService from './credit.service';
import pick from '../utils/pick';

export const earnCredits = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params['tenantId']!;
  const { amount, memo } = req.body;
  const orgId = req.orgId!;

  const transaction = await creditService.earnCredit(orgId, tenantId, amount, memo);
  res.status(httpStatus.CREATED).send(transaction);
});

export const redeemCredits = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params['tenantId']!;
  const { amount, memo } = req.body;
  const orgId = req.orgId!;

  const transaction = await creditService.redeemCredit(orgId, tenantId, amount, memo);
  res.status(httpStatus.CREATED).send(transaction);
});

export const adjustCredits = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params['tenantId']!;
  const { amount, memo } = req.body;
  const orgId = req.orgId!;

  const transaction = await creditService.adjustCredit(orgId, tenantId, amount, memo);
  res.status(httpStatus.CREATED).send(transaction);
});

export const getCreditLedger = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params['tenantId']!;
  const orgId = req.orgId!;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await creditService.getTenantLedger(tenantId, orgId, options);
  res.send(result);
});

export const getCreditBalance = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params['tenantId']!;
  const orgId = req.orgId!;

  const balance = await creditService.getTenantBalance(tenantId, orgId);
  res.send({ balance });
});

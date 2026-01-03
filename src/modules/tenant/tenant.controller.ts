import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as tenantService from './tenant.service';

export const createTenant = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const unitId = req.params['unitId'] as string;
  const tenant = await tenantService.createTenant(orgId, unitId, req.body);
  res.status(httpStatus.CREATED).send(tenant);
});

export const getTenantMe = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const userId = (req.user as any).id;
  const tenant = await tenantService.getTenantByUserId(userId, orgId);
  res.send(tenant);
});

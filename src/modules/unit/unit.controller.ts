import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as unitService from './unit.service';
import pick from '../utils/pick';

export const createUnit = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const propertyId = req.params['propertyId'] as string;
  const unit = await unitService.createUnit(orgId, propertyId, req.body);
  res.status(httpStatus.CREATED).send(unit);
});

export const getUnits = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const propertyId = req.params['propertyId'] as string;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await unitService.queryUnits(orgId, propertyId, options);
  res.send(result);
});

export const getUnit = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const unit = await unitService.getUnitById(req.params['unitId'] as string, orgId);
  res.send(unit);
});

export const updateUnit = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const unit = await unitService.updateUnitById(req.params['unitId'] as string, orgId, req.body);
  res.send(unit);
});

export const deleteUnit = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  await unitService.deleteUnitById(req.params['unitId'] as string, orgId);
  res.status(httpStatus.NO_CONTENT).send();
});

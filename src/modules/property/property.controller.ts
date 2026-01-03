import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as propertyService from './property.service';
import pick from '../utils/pick';

export const createProperty = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const property = await propertyService.createProperty(orgId, req.body);
  res.status(httpStatus.CREATED).send(property);
});

export const getProperties = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  
  // Build filter for city/state
  const filter: Record<string, any> = {};
  if (req.query['city']) {
    filter['address.city'] = req.query['city'];
  }
  if (req.query['state']) {
    filter['address.state'] = req.query['state'];
  }
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await propertyService.queryProperties(orgId, filter, options);
  res.send(result);
});

export const getProperty = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const property = await propertyService.getPropertyById(req.params['propertyId'] as string, orgId);
  res.send(property);
});

export const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const property = await propertyService.updatePropertyById(req.params['propertyId'] as string, orgId, req.body);
  res.send(property);
});

export const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  await propertyService.deletePropertyById(req.params['propertyId'] as string, orgId);
  res.status(httpStatus.NO_CONTENT).send();
});


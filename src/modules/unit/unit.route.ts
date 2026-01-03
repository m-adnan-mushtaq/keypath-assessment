import express, { Router } from 'express';
import { multiTenantAuth, authorize } from '../auth/multiTenantAuth.middleware';
import { validateZod } from '../validate/zodValidate.middleware';
import { createUnitSchema, getUnitsSchema } from './unit.validation';
import * as unitController from './unit.controller';

const router: Router = express.Router();

// Nested under /properties/:propertyId/units
router
  .route('/')
  .post(
    multiTenantAuth(),
    authorize('manageUnits'),
    validateZod(createUnitSchema),
    unitController.createUnit
  )
  .get(
    multiTenantAuth(),
    authorize('manageUnits'),
    validateZod(getUnitsSchema),
    unitController.getUnits
  );

export default router;

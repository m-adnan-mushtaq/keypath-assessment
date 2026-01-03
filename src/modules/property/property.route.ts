import express, { Router } from 'express';
import { multiTenantAuth, authorize } from '../auth/multiTenantAuth.middleware';
import { validateZod } from '../validate/zodValidate.middleware';
import { createPropertySchema, getPropertiesSchema, getPropertySchema } from './property.validation';
import * as propertyController from './property.controller';
import unitRoute from '../unit/unit.route';

const router: Router = express.Router();

router
  .route('/')
  .post(
    multiTenantAuth(),
    authorize('manageProperties'),
    validateZod(createPropertySchema),
    propertyController.createProperty
  )
  .get(
    multiTenantAuth(),
    authorize('manageProperties'),
    validateZod(getPropertiesSchema),
    propertyController.getProperties
  );

router
  .route('/:propertyId')
  .get(
    multiTenantAuth(),
    authorize('manageProperties'),
    validateZod(getPropertySchema),
    propertyController.getProperty
  )
  .patch(
    multiTenantAuth(),
    authorize('manageProperties'),
    validateZod(getPropertySchema),
    propertyController.updateProperty
  )
  .delete(
    multiTenantAuth(),
    authorize('manageProperties'),
    validateZod(getPropertySchema),
    propertyController.deleteProperty
  );

// Nested unit routes
router.use('/:propertyId/units', unitRoute);

export default router;

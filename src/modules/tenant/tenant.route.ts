import express, { Router } from 'express';
import { multiTenantAuth, authorize } from '../auth/multiTenantAuth.middleware';
import { validateZod } from '../validate/zodValidate.middleware';
import { getTenantMeSchema } from './tenant.validation';
import * as tenantController from './tenant.controller';

const router: Router = express.Router();

// GET /tenants/me - Tenant gets their own profile
router
  .route('/me')
  .get(
    multiTenantAuth(),
    authorize('getOwnProfile'),
    validateZod(getTenantMeSchema),
    tenantController.getTenantMe
  );

export default router;

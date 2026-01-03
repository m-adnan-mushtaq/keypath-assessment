import express from 'express';
import { multiTenantAuth, authorize, canAccessTenant } from '../auth/multiTenantAuth.middleware';
import { validateZod } from '../validate/zodValidate.middleware';
import * as creditValidation from './credit.validation';
import * as creditController from './credit.controller';

const router = express.Router();

// Earn credits - landlord/admin only
router.post(
  '/:tenantId/credits/earn',
  multiTenantAuth(),
  authorize('manageCredits'),
  validateZod(creditValidation.earnCreditsSchema),
  creditController.earnCredits
);

// Redeem credits - tenant can redeem their own, landlord/admin can redeem any
router.post(
  '/:tenantId/credits/redeem',
  multiTenantAuth(),
  async (req, res, next) => {
    const tenantId = req.params['tenantId']!;
    if (await canAccessTenant(req, tenantId)) {
      next();
    } else {
      res.status(403).send({ message: 'Forbidden' });
    }
  },
  validateZod(creditValidation.redeemCreditsSchema),
  creditController.redeemCredits
);

// Get credit ledger - tenant can view their own, landlord/admin can view any
router.get(
  '/:tenantId/credits/ledger',
  multiTenantAuth(),
  async (req, res, next) => {
    const tenantId = req.params['tenantId']!;
    if (await canAccessTenant(req, tenantId)) {
      next();
    } else {
      res.status(403).send({ message: 'Forbidden' });
    }
  },
  validateZod(creditValidation.getCreditLedgerSchema),
  creditController.getCreditLedger
);

// Get credit balance - tenant can view their own, landlord/admin can view any
router.get(
  '/:tenantId/credits/balance',
  multiTenantAuth(),
  async (req, res, next) => {
    const tenantId = req.params['tenantId']!;
    if (await canAccessTenant(req, tenantId)) {
      next();
    } else {
      res.status(403).send({ message: 'Forbidden' });
    }
  },
  validateZod(creditValidation.getCreditBalanceSchema),
  creditController.getCreditBalance
);

export default router;

import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../app';
import setupTestDB from '../jest/setupTestDB';
import Property from '../property/property.model';
import Unit from '../unit/unit.model';
import Tenant from '../tenant/tenant.model';
import CreditTransaction from './credit.model';

setupTestDB();

describe('Credit Routes', () => {
  const org1Id = 'org-001';
  const org2Id = 'org-002';
  const landlord1Headers = {
    'x-user-id': 'landlord-001',
    'x-org-id': org1Id,
    'x-role': 'landlord',
  };
  const landlord2Headers = {
    'x-user-id': 'landlord-002',
    'x-org-id': org2Id,
    'x-role': 'landlord',
  };
  const tenant1Headers = {
    'x-user-id': 'tenant-001',
    'x-org-id': org1Id,
    'x-role': 'tenant',
  };

  let property1: any;
  let unit1: any;
  let tenant1: any;

  beforeEach(async () => {
    // Create property in org1
    property1 = await Property.create({
      orgId: org1Id,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94101',
        country: 'USA',
      },
      nickname: 'Test Property',
    });

    // Create unit in property1
    unit1 = await Unit.create({
      orgId: org1Id,
      propertyId: property1._id,
      unitNumber: '101',
      rent: 2500,
    });

    // Create tenant in unit1
    tenant1 = await Tenant.create({
      orgId: org1Id,
      unitId: unit1._id,
      userId: 'tenant-001',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  describe('POST /v1/tenants/:tenantId/credits/earn', () => {
    test('should return 201 and earn credits for tenant', async () => {
      const res = await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({
          amount: 100,
          memo: 'Test earn',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('amount', 100);
      expect(res.body).toHaveProperty('type', 'EARN');
      expect(res.body).toHaveProperty('tenantId', tenant1._id.toString());
      expect(res.body).toHaveProperty('orgId', org1Id);
    });

    test('should return 400 for negative amount', async () => {
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({
          amount: -100,
          memo: 'Invalid earn',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 403 for tenant role trying to earn credits', async () => {
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(tenant1Headers)
        .send({
          amount: 100,
          memo: 'Unauthorized earn',
        })
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('POST /v1/tenants/:tenantId/credits/redeem - Balance Validation', () => {
    test('should return 400 when redeeming more than available balance', async () => {
      // Earn 100 credits
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({
          amount: 100,
          memo: 'Initial earn',
        })
        .expect(httpStatus.CREATED);

      // Try to redeem 150 (more than balance of 100)
      const res = await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/redeem`)
        .set(tenant1Headers)
        .send({
          amount: 150,
          memo: 'Excessive redeem',
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('Insufficient balance');
      expect(res.body.message).toContain('Current balance: 100');
      expect(res.body.message).toContain('Requested: 150');
    });

    test('should return 201 when redeeming within available balance', async () => {
      // Earn 100 credits
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({
          amount: 100,
          memo: 'Initial earn',
        })
        .expect(httpStatus.CREATED);

      // Redeem 50 (within balance)
      const res = await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/redeem`)
        .set(tenant1Headers)
        .send({
          amount: 50,
          memo: 'Valid redeem',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('amount', -50);
      expect(res.body).toHaveProperty('type', 'REDEEM');

      // Verify remaining balance is 50
      const balanceRes = await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.OK);

      expect(balanceRes.body.balance).toBe(50);
    });
  });

  describe('GET /v1/tenants/:tenantId/credits/balance - Balance Derivation', () => {
    test('should correctly compute balance from multiple transaction types', async () => {
      // EARN 100
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 100, memo: 'Earn 100' })
        .expect(httpStatus.CREATED);

      // REDEEM 30
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/redeem`)
        .set(tenant1Headers)
        .send({ amount: 30, memo: 'Redeem 30' })
        .expect(httpStatus.CREATED);

      // EARN 50
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 50, memo: 'Earn 50' })
        .expect(httpStatus.CREATED);

      // REDEEM 20
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/redeem`)
        .set(tenant1Headers)
        .send({ amount: 20, memo: 'Redeem 20' })
        .expect(httpStatus.CREATED);

      // Verify balance = 100 - 30 + 50 - 20 = 100
      const res = await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.OK);

      expect(res.body.balance).toBe(100);
    });

    test('should return 0 balance for tenant with no transactions', async () => {
      const res = await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.OK);

      expect(res.body.balance).toBe(0);
    });
  });

  describe('GET /v1/tenants/:tenantId/credits/ledger', () => {
    test('should return paginated ledger with transactions in descending order', async () => {
      // Create multiple transactions
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 100, memo: 'Transaction 1' })
        .expect(httpStatus.CREATED);

      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 50, memo: 'Transaction 2' })
        .expect(httpStatus.CREATED);

      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/redeem`)
        .set(tenant1Headers)
        .send({ amount: 30, memo: 'Transaction 3' })
        .expect(httpStatus.CREATED);

      const res = await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/ledger`)
        .set(tenant1Headers)
        .query({ sortBy: 'createdAt:desc', limit: 10, page: 1 })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('totalResults', 3);
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].memo).toBe('Transaction 3'); // Most recent first
    });
  });

  describe('Auth Scoping Tests', () => {
    test('should prevent tenant from org2 accessing org1 tenant credits', async () => {
      // Try to access org1 tenant with org2 credentials
      await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(landlord2Headers)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should prevent earning credits for tenant in different org', async () => {
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord2Headers)
        .send({ amount: 100, memo: 'Cross-org earn' })
        .expect(httpStatus.NOT_FOUND);
    });

    test('should allow tenant to access their own credits', async () => {
      // Earn some credits first
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 100, memo: 'Test' })
        .expect(httpStatus.CREATED);

      // Tenant should be able to view their own balance
      await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.OK);
    });

    test('should prevent tenant from viewing another tenant credits in same org', async () => {
      // Create another tenant in same org
      const tenant2 = await Tenant.create({
        orgId: org1Id,
        unitId: unit1._id,
        userId: 'tenant-002',
        name: 'Jane Smith',
        email: 'jane@example.com',
      });

      const tenant2Headers = {
        'x-user-id': 'tenant-002',
        'x-org-id': org1Id,
        'x-role': 'tenant',
      };

      // tenant-001 tries to access tenant-002's credits
      await request(app)
        .get(`/v1/tenants/${tenant2._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.FORBIDDEN);

      // tenant-002 should be able to access their own
      await request(app)
        .get(`/v1/tenants/${tenant2._id}/credits/balance`)
        .set(tenant2Headers)
        .expect(httpStatus.OK);
    });
  });

  describe('Immutability Tests - Append-Only Ledger', () => {
    test('should prevent updating credit transaction', async () => {
      const transaction = await CreditTransaction.create({
        orgId: org1Id,
        tenantId: tenant1._id,
        unitId: unit1._id,
        type: 'EARN',
        amount: 100,
        memo: 'Original memo',
      });

      // Try to update - should throw error
      await expect(
        CreditTransaction.findByIdAndUpdate(transaction._id, { amount: 200 })
      ).rejects.toThrow('Credit transactions cannot be updated');
    });

    test('should prevent deleting credit transaction', async () => {
      const transaction = await CreditTransaction.create({
        orgId: org1Id,
        tenantId: tenant1._id,
        unitId: unit1._id,
        type: 'EARN',
        amount: 100,
        memo: 'To be deleted',
      });

      // Try to delete - should throw error
      await expect(
        CreditTransaction.findByIdAndDelete(transaction._id)
      ).rejects.toThrow('append-only ledger');
    });

    test('should allow creating ADJUST transaction for corrections', async () => {
      // Original EARN transaction
      await request(app)
        .post(`/v1/tenants/${tenant1._id}/credits/earn`)
        .set(landlord1Headers)
        .send({ amount: 100, memo: 'Original earn' })
        .expect(httpStatus.CREATED);

      // Create ADJUST transaction (correction)
      const adjustment = await CreditTransaction.create({
        orgId: org1Id,
        tenantId: tenant1._id,
        unitId: unit1._id,
        type: 'ADJUST',
        amount: -10,
        memo: 'Correction: reduce by 10',
      });

      expect(adjustment.amount).toBe(-10);
      expect(adjustment.type).toBe('ADJUST');

      // Verify balance reflects adjustment
      const res = await request(app)
        .get(`/v1/tenants/${tenant1._id}/credits/balance`)
        .set(tenant1Headers)
        .expect(httpStatus.OK);

      expect(res.body.balance).toBe(90);
    });
  });
});

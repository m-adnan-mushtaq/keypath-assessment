import { z } from 'zod';

export const createTenantSchema = z.object({
  params: z.object({
    unitId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid unit ID'),
  }),
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  }),
});

export const getTenantMeSchema = z.object({});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

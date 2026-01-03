import { z } from 'zod';

export const createPropertySchema = z.object({
  body: z.object({
    address: z.object({
      street: z.string().min(1, 'Street is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(2).max(2, 'State must be 2 characters'),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format'),
      country: z.string().default('USA'),
    }),
    nickname: z.string().optional(),
  }),
});

export const getPropertiesSchema = z.object({
  query: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    sortBy: z.string().optional(),
    limit: z.string().optional(),
    page: z.string().optional(),
  }),
});

export const getPropertySchema = z.object({
  params: z.object({
    propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid property ID'),
  }),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type GetPropertiesInput = z.infer<typeof getPropertiesSchema>;
export type GetPropertyInput = z.infer<typeof getPropertySchema>;

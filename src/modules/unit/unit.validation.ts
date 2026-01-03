import { z } from 'zod';

export const createUnitSchema = z.object({
  params: z.object({
    propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid property ID'),
  }),
  body: z.object({
    unitNumber: z.string().min(1, 'Unit number is required'),
    rent: z.number().min(0, 'Rent must be a positive number'),
  }),
});

export const getUnitsSchema = z.object({
  params: z.object({
    propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid property ID'),
  }),
  query: z.object({
    sortBy: z.string().optional(),
    limit: z.string().optional(),
    page: z.string().optional(),
  }),
});

export const getUnitSchema = z.object({
  params: z.object({
    unitId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid unit ID'),
  }),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type GetUnitsInput = z.infer<typeof getUnitsSchema>;
export type GetUnitInput = z.infer<typeof getUnitSchema>;

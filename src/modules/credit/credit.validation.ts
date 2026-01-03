import { z } from 'zod';

export const earnCreditsSchema = z.object({
  params: z.object({
    tenantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID'),
  }),
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    memo: z.string().optional(),
  }),
});

export const redeemCreditsSchema = z.object({
  params: z.object({
    tenantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID'),
  }),
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    memo: z.string().optional(),
  }),
});

export const getCreditLedgerSchema = z.object({
  params: z.object({
    tenantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID'),
  }),
  query: z.object({
    sortBy: z.string().optional(),
    limit: z.string().optional(),
    page: z.string().optional(),
  }),
});

export const getCreditBalanceSchema = z.object({
  params: z.object({
    tenantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID'),
  }),
});

export type EarnCreditsInput = z.infer<typeof earnCreditsSchema>;
export type RedeemCreditsInput = z.infer<typeof redeemCreditsSchema>;
export type GetCreditLedgerInput = z.infer<typeof getCreditLedgerSchema>;
export type GetCreditBalanceInput = z.infer<typeof getCreditBalanceSchema>;

import { Document, Model } from 'mongoose';

export enum CreditTransactionType {
  EARN = 'EARN',
  ADJUST = 'ADJUST',
  REDEEM = 'REDEEM',
}

export interface ICreditTransaction {
  orgId: string;
  tenantId: string;
  unitId: string;
  type: CreditTransactionType;
  amount: number; // Positive for EARN/ADJUST (credit), negative for REDEEM/ADJUST (debit)
  memo?: string;
}

export interface ICreditTransactionDoc extends ICreditTransaction, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreditTransactionModel extends Model<ICreditTransactionDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<any>;
}

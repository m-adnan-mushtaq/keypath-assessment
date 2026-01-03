import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ICreditTransactionDoc, ICreditTransactionModel, CreditTransactionType } from './credit.interfaces';

const creditTransactionSchema = new mongoose.Schema<ICreditTransactionDoc, ICreditTransactionModel>(
  {
    orgId: {
      type: String,
      required: true,
      index: true, // Critical for org-scoping
      immutable: true, // Ledger is append-only
    },
    tenantId: {
      type: String,
      required: true,
      ref: 'Tenant',
      index: true, // For querying tenant's ledger
      immutable: true,
    },
    unitId: {
      type: String,
      required: true,
      ref: 'Unit',
      immutable: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(CreditTransactionType),
      immutable: true,
    },
    amount: {
      type: Number,
      required: true,
      immutable: true,
    },
    memo: {
      type: String,
      trim: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
creditTransactionSchema.plugin(toJSON);
creditTransactionSchema.plugin(paginate);

// Compound indexes for efficient querying
creditTransactionSchema.index({ orgId: 1, tenantId: 1, createdAt: -1 });
creditTransactionSchema.index({ tenantId: 1, createdAt: -1 });

// Prevent updates and deletes - ledger is append-only
creditTransactionSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Credit transactions cannot be updated. Add an ADJUST transaction instead.'));
});

creditTransactionSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Credit transactions cannot be deleted. This is an append-only ledger.'));
});

const CreditTransaction = mongoose.model<ICreditTransactionDoc, ICreditTransactionModel>(
  'CreditTransaction',
  creditTransactionSchema
);

export default CreditTransaction;

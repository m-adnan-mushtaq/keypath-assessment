import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ITenantDoc, ITenantModel } from './tenant.interfaces';

const tenantSchema = new mongoose.Schema<ITenantDoc, ITenantModel>(
  {
    unitId: {
      type: String,
      required: true,
      ref: 'Unit',
      index: true,
    },
    orgId: {
      type: String,
      required: true,
      index: true, // Critical for org-scoping
    },
    userId: {
      type: String,
      required: true,
      unique: true, // One tenant profile per user
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate(value: string) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
tenantSchema.plugin(toJSON);
tenantSchema.plugin(paginate);

// Compound indexes
tenantSchema.index({ orgId: 1, email: 1 }, { unique: true });
tenantSchema.index({ orgId: 1, unitId: 1 });

const Tenant = mongoose.model<ITenantDoc, ITenantModel>('Tenant', tenantSchema);

export default Tenant;

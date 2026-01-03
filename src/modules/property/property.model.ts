import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IPropertyDoc, IPropertyModel } from './property.interfaces';

const propertySchema = new mongoose.Schema<IPropertyDoc, IPropertyModel>(
  {
    orgId: {
      type: String,
      required: true,
      index: true, // Critical for org-scoping queries
    },
    address: {
      street: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        index: true, // For filtering by city
      },
      state: {
        type: String,
        required: true,
        trim: true,
        index: true, // For filtering by state
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
        default: 'USA',
      },
    },
    nickname: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
propertySchema.plugin(toJSON);
propertySchema.plugin(paginate);

// Compound index for org-scoped queries with city/state filters
propertySchema.index({ orgId: 1, 'address.city': 1 });
propertySchema.index({ orgId: 1, 'address.state': 1 });

const Property = mongoose.model<IPropertyDoc, IPropertyModel>('Property', propertySchema);

export default Property;

import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IUnitDoc, IUnitModel } from './unit.interfaces';

const unitSchema = new mongoose.Schema<IUnitDoc, IUnitModel>(
  {
    propertyId: {
      type: String,
      required: true,
      ref: 'Property',
      index: true, // For querying units by property
    },
    unitNumber: {
      type: String,
      required: true,
      trim: true,
    },
    rent: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
unitSchema.plugin(toJSON);
unitSchema.plugin(paginate);

// Compound index for unique unit numbers per property
unitSchema.index({ propertyId: 1, unitNumber: 1 }, { unique: true });

const Unit = mongoose.model<IUnitDoc, IUnitModel>('Unit', unitSchema);

export default Unit;

import { Document, Model } from 'mongoose';

export interface ITenant {
  unitId: string;
  orgId: string;
  userId: string; // Reference to the user ID from auth headers
  name: string;
  email: string;
}

export interface ITenantDoc extends ITenant, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantModel extends Model<ITenantDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<any>;
}

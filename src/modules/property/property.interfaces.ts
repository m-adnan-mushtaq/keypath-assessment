import { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IProperty {
  orgId: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  nickname?: string;
}

export interface IPropertyDoc extends IProperty, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPropertyModel extends Model<IPropertyDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

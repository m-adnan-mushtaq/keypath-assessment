import { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IUnit {
  propertyId: string;
  unitNumber: string;
  rent: number;
}

export interface IUnitDoc extends IUnit, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IUnitModel extends Model<IUnitDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

// Re-exported from common/utils/egypt.util so the storefront's existing
// imports keep resolving. New code should import from there directly.
import { EGYPT_GOVERNORATES, EgyptGovernorate } from '@/common/utils/egypt.util';
export { EGYPT_GOVERNORATES };
export type { EgyptGovernorate };

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  // Recipient name — kept separate from the account holder's name since the
  // person receiving a delivery isn't always the account owner.
  @Prop({ required: true, trim: true })
  firstName: string = '';

  @Prop({ required: true, trim: true })
  lastName: string = '';

  @Prop({ required: true, trim: true })
  phone: string = '';

  @Prop({ required: true, trim: true })
  addressLine: string = '';

  @Prop({ required: true, trim: true })
  city: string = '';

  @Prop({ required: true, enum: EGYPT_GOVERNORATES })
  governorate: EgyptGovernorate = 'Cairo';

  @Prop({ type: String, default: null, trim: true })
  postalCode: string | null = null;

  @Prop({ default: false })
  isDefault: boolean = false;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ user: 1 });

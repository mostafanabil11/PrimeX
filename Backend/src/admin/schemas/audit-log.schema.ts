import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

// Append-only, same convention as StockMovement — written only by
// AuditListener reacting to the 'admin.mutation' event, never updated or
// deleted, so it stays a trustworthy record of what admins actually did.
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  admin: Types.ObjectId | null = null;

  @Prop({ type: String, default: null })
  adminEmail: string | null = null;

  // e.g. "product.create", "order.status_update" — dot-namespaced so the
  // admin UI can filter/group by entity without a separate entityType field.
  @Prop({ required: true })
  action: string = '';

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  params: unknown = null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  body: unknown = null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  resultSummary: unknown = null;

  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

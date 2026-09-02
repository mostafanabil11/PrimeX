import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

// Generic atomic-sequence store, shared by whatever module needs a gapless
// running number — invoice numbers (InvoicesService) and member numbers
// (AuthService) today. Lives in common/ rather than in either of them because
// it started life inside the orders/ module (order numbers were the first
// user) and stayed there even after invoices and auth started sharing it,
// which made "orders" a dependency neither of them actually had. Moved here
// when the orders module itself was removed — see that commit.
//
// A single findOneAndUpdate({key}, {$inc: {seq: 1}}, {upsert: true}) against
// this collection is how a number gets issued — Mongo guarantees that
// single-document update is atomic, so two requests in the same millisecond
// still get distinct numbers without any application-level locking.
@Schema({ timestamps: false })
export class Counter {
  @Prop({ required: true, unique: true })
  key: string = '';

  @Prop({ required: true, default: 0 })
  seq: number = 0;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);

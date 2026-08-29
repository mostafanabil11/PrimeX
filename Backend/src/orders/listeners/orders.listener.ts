import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { OrderDocument } from '../schemas/order.schema';

@Injectable()
export class OrdersListener {
  constructor(private emailService: EmailService) {}

  @OnEvent('order.placed')
  async handleOrderPlacedEvent(payload: {
    email: string;
    firstName: string;
    order: OrderDocument;
  }) {
    const { order } = payload;
    const emailTemplate = EmailUtils.generateOrderConfirmationEmailTemplate(payload.firstName, {
      orderNumber: order.orderNumber,
      items: order.items.map(item => ({
        name: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount,
      total: order.total,
      currency: order.currency,
      shippingAddress: {
        firstName: order.shippingAddress.firstName,
        lastName: order.shippingAddress.lastName,
        addressLine: order.shippingAddress.addressLine,
        city: order.shippingAddress.city,
        governorate: order.shippingAddress.governorate,
      },
    });

    await this.emailService.sendOrderConfirmationEmail(
      payload.email,
      payload.firstName,
      order.orderNumber,
      emailTemplate
    );
  }

  @OnEvent('order.shipped')
  async handleOrderShippedEvent(payload: {
    email: string;
    firstName: string;
    order: OrderDocument;
  }) {
    const template = EmailUtils.generateOrderShippedEmailTemplate(
      payload.firstName,
      payload.order.orderNumber,
      payload.order.trackingNumber
    );
    await this.emailService.sendOrderShippedEmail(
      payload.email,
      payload.order.orderNumber,
      template
    );
  }

  @OnEvent('order.delivered')
  async handleOrderDeliveredEvent(payload: {
    email: string;
    firstName: string;
    order: OrderDocument;
  }) {
    const template = EmailUtils.generateOrderDeliveredEmailTemplate(
      payload.firstName,
      payload.order.orderNumber
    );
    await this.emailService.sendOrderDeliveredEmail(
      payload.email,
      payload.order.orderNumber,
      template
    );
  }

  @OnEvent('order.refunded')
  async handleOrderRefundedEvent(payload: {
    email: string;
    firstName: string;
    order: OrderDocument;
  }) {
    const template = EmailUtils.generateOrderRefundedEmailTemplate(
      payload.firstName,
      payload.order.orderNumber,
      payload.order.total,
      payload.order.currency
    );
    await this.emailService.sendOrderRefundedEmail(
      payload.email,
      payload.order.orderNumber,
      template
    );
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelledEvent(payload: {
    email: string;
    firstName: string;
    order: OrderDocument;
  }) {
    const template = EmailUtils.generateOrderCancelledEmailTemplate(
      payload.firstName,
      payload.order.orderNumber
    );
    await this.emailService.sendOrderCancelledEmail(
      payload.email,
      payload.order.orderNumber,
      template
    );
  }
}

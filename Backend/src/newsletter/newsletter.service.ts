import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from './schemas/newsletter-subscriber.schema';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private subscriberModel: Model<NewsletterSubscriberDocument>
  ) {}

  // Idempotent on purpose — resubmitting the same email (double-click, form
  // retry) is a no-op rather than a duplicate-key error the client has to
  // handle specially.
  async subscribe(email: string) {
    await this.subscriberModel.updateOne(
      { email: email.toLowerCase().trim() },
      { $setOnInsert: { email: email.toLowerCase().trim() } },
      { upsert: true }
    );
    return {
      success: true,
      message: "You're subscribed",
      data: null,
    };
  }

  async listAll() {
    const subscribers = await this.subscriberModel.find().sort({ createdAt: -1 });
    return {
      success: true,
      message: 'Subscribers retrieved',
      data: subscribers,
    };
  }
}

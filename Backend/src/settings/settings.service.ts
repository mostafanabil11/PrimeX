import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>) {}

  // Upsert against an empty filter — there is only ever one settings
  // document, created lazily on first read/write rather than via a seed.
  async getSettings() {
    const settings = await this.settingsModel.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    );

    return {
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      {},
      { $set: dto },
      { upsert: true, new: true }
    );

    return {
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    };
  }
}

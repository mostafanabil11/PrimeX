import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(@InjectModel(Address.name) private addressModel: Model<AddressDocument>) {}

  // Every method here takes userId and filters by it — that filter *is* the
  // ownership check. There's no separate guard because "found but not
  // yours" and "doesn't exist" should look identical from the outside.
  private async findOwnedOrThrow(userId: string, id: string): Promise<AddressDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid address id');
    }
    const address = await this.addressModel.findOne({ _id: id, user: userId });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.addressModel.countDocuments({ user: userId });
    // The very first address is always the default — there's nothing to
    // choose between yet. After that, isDefault only flips on request.
    const makeDefault = existingCount === 0 || dto.isDefault === true;

    if (makeDefault && existingCount > 0) {
      await this.addressModel.updateMany({ user: userId, isDefault: true }, { isDefault: false });
    }

    const address = await this.addressModel.create({
      user: userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      city: dto.city,
      governorate: dto.governorate,
      postalCode: dto.postalCode ?? null,
      isDefault: makeDefault,
    });

    return {
      success: true,
      message: 'Address added successfully',
      data: address,
    };
  }

  async findAll(userId: string) {
    const addresses = await this.addressModel
      .find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });

    return {
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses,
    };
  }

  async findOne(userId: string, id: string) {
    const address = await this.findOwnedOrThrow(userId, id);
    return {
      success: true,
      message: 'Address retrieved successfully',
      data: address,
    };
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.findOwnedOrThrow(userId, id);

    if (dto.isDefault === true && !address.isDefault) {
      await this.addressModel.updateMany({ user: userId, isDefault: true }, { isDefault: false });
      address.isDefault = true;
    }

    if (dto.firstName !== undefined) address.firstName = dto.firstName;
    if (dto.lastName !== undefined) address.lastName = dto.lastName;
    if (dto.phone !== undefined) address.phone = dto.phone;
    if (dto.addressLine !== undefined) address.addressLine = dto.addressLine;
    if (dto.city !== undefined) address.city = dto.city;
    if (dto.governorate !== undefined) address.governorate = dto.governorate;
    if (dto.postalCode !== undefined) address.postalCode = dto.postalCode ?? null;

    await address.save();

    return {
      success: true,
      message: 'Address updated successfully',
      data: address,
    };
  }

  async remove(userId: string, id: string) {
    const address = await this.findOwnedOrThrow(userId, id);
    const wasDefault = address.isDefault;
    await address.deleteOne();

    if (wasDefault) {
      // Promote whichever address is left so there's never a moment with
      // saved addresses but no default — checkout always has one to preselect.
      const nextDefault = await this.addressModel.findOne({ user: userId }).sort({ createdAt: -1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    return {
      success: true,
      message: 'Address removed successfully',
      data: null,
    };
  }
}

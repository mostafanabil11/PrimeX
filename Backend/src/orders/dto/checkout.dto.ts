import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { cartItemSchema } from '@/cart/dto/cart-item.dto';
import { EGYPT_GOVERNORATES } from '@/addresses/schemas/address.schema';

// Same fields as CreateAddressDto, minus isDefault — a guest has no address
// book for a default to mean anything in. Kept as its own schema rather than
// imported so the two can diverge (e.g. saved addresses gaining a label)
// without silently changing what checkout accepts.
export const guestShippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(6, 'Please provide a valid phone number').max(30),
  addressLine: z.string().min(1, 'Address is required').max(300),
  city: z.string().min(1, 'City is required').max(100),
  governorate: z.enum(EGYPT_GOVERNORATES),
  postalCode: z.string().max(20).optional().nullable(),
});

export const checkoutSchema = z
  .object({
    // --- Signed-in path: pick a saved address, cart comes from the server ---
    addressId: z.string().min(1).optional(),

    // --- Guest path: address and contact typed inline, cart sent with the
    // request. The items are only ever used as a *statement of intent* — the
    // server re-prices every line against live product data before charging
    // anything, exactly as it does for a signed-in user's server cart.
    email: z.string().trim().email('Please provide a valid email address').max(200).optional(),
    shippingAddress: guestShippingAddressSchema.optional(),
    items: z.array(cartItemSchema).max(100).optional(),

    paymentMethod: z.enum(['cod', 'card']).default('cod'),
    // Optional — if the client doesn't supply one, the server generates one
    // internally so retries within a single checkout attempt still dedupe.
    // A client-supplied key lets a *new* checkout click after a network
    // failure safely retry without risking a double order.
    idempotencyKey: z.string().max(100).optional(),
    couponCode: z.string().max(30).optional(),
  })
  // Exactly one of the two shapes must be present. Enforced here rather than
  // in the service so a malformed request is rejected before it can touch
  // stock, and so the error points at the specific missing field.
  .superRefine((data, ctx) => {
    if (data.addressId) {
      return;
    }

    if (!data.shippingAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shippingAddress'],
        message: 'A shipping address is required',
      });
    }
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'An email address is required so we can send your order confirmation',
      });
    }
    if (!data.items || data.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'Your cart is empty',
      });
    }
  });

export class CheckoutDto extends createZodDto(checkoutSchema) {}

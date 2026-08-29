import { useCartStore } from "@/store/cart";
import { addServerCartItem } from "@/lib/api/cart";

// Called once, right after login/signup succeeds. The local (guest) cart
// items get folded into the now-authenticated user's server cart one at a
// time — addServerCartItem already merges quantities on a repeat
// product+size, so this is safe to call even if the server cart already
// had some of the same items in it from another device.
export async function mergeLocalCartIntoServerCart(): Promise<void> {
  const { items, clear } = useCartStore.getState();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      await addServerCartItem(item.productId, item.size, item.quantity);
    } catch {
      // Best-effort: one bad line (e.g. a product deleted since it was
      // added) shouldn't block the rest of the merge or block login.
    }
  }

  clear();
}

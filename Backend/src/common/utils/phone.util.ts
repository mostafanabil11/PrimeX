// Egyptian phone numbers, reduced to one comparable form.
//
// The same human gives their number as "010 2059 8691", "+20 102 059 8691" or
// "0020 102 059 8691" depending on who is asking, and the DTOs accept all of
// them on purpose — asking a member to reformat their own number is how you
// lose a reservation. That tolerance has to stop somewhere, though, or one
// person becomes three member records, so it stops here: `phone` keeps what
// they typed and `phoneNormalized` holds this, which is what we index and
// look up by.
//
// Deliberately mirrors whatsappHref() in Frontend/src/lib/gym-format.ts —
// both turn a locally-written Egyptian number into country-code digits, and
// they have to agree or a member reserved under one form would be messaged
// under another. Change one, change both.

const EGYPT_COUNTRY_CODE = '20';

// Shortest thing that could plausibly be a real number once punctuation is
// stripped. Below this it is a typo, and returning null lets the caller say so
// rather than silently indexing junk that can then collide with other junk.
const MIN_DIGITS = 8;

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');

  // International prefix written out long-hand: 0020… is +20…
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    // The trunk zero. Egyptians write and read their mobile as 010…, but that
    // leading zero is a domestic dialling artefact, not part of the number —
    // it becomes the country code, exactly as whatsappHref does it.
    digits = `${EGYPT_COUNTRY_CODE}${digits.slice(1)}`;
  } else if (digits.startsWith('1') && digits.length >= 10) {
    // Given without either prefix — "102 059 8691". Egyptian mobiles all begin
    // 1 after the country code, so this is unambiguous at this length.
    digits = `${EGYPT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length < MIN_DIGITS) return null;

  return digits;
}

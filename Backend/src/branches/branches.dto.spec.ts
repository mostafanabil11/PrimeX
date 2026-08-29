import { createBranchSchema } from './dto/create-branch.dto';
import { updateBranchSchema } from './dto/update-branch.dto';

describe('branch DTO schemas', () => {
  const validCreate = {
    name: 'New Cairo Flagship',
    addressLine: '90th Street North',
    city: 'New Cairo',
    governorate: 'Cairo',
    facilities: ['Sauna', 'Steam room'],
    openingHours: [{ day: 'sunday', opensAt: '06:00', closesAt: '23:00' }],
    sortOrder: 3,
  };

  describe('createBranchSchema', () => {
    it('accepts a complete branch', () => {
      const parsed = createBranchSchema.parse(validCreate);
      expect(parsed.facilities).toEqual(['Sauna', 'Steam room']);
      expect(parsed.sortOrder).toBe(3);
    });

    it('rejects a governorate that is not Egyptian', () => {
      expect(() => createBranchSchema.parse({ ...validCreate, governorate: 'Atlantis' })).toThrow();
    });

    it('rejects closing before opening', () => {
      expect(() =>
        createBranchSchema.parse({
          ...validCreate,
          openingHours: [{ day: 'monday', opensAt: '22:00', closesAt: '06:00' }],
        })
      ).toThrow();
    });

    it('allows a closed day to skip the time ordering rule', () => {
      const parsed = createBranchSchema.parse({
        ...validCreate,
        openingHours: [{ day: 'friday', isClosed: true, opensAt: '00:00', closesAt: '00:00' }],
      });
      expect(parsed.openingHours?.[0].isClosed).toBe(true);
    });

    it('rejects a malformed time', () => {
      expect(() =>
        createBranchSchema.parse({
          ...validCreate,
          openingHours: [{ day: 'monday', opensAt: '6am', closesAt: '23:00' }],
        })
      ).toThrow();
    });
  });

  describe('updateBranchSchema', () => {
    // The regression this file exists for. A PATCH carrying one field must
    // parse to exactly that field: any default leaking in becomes a $set that
    // erases real data. This wiped a branch's facilities, opening hours and
    // women-only windows the first time the module was exercised by hand.
    it('does not invent values for fields the caller left out', () => {
      const parsed = updateBranchSchema.parse({ phone: '+20 2 2618 9999' });

      expect(Object.keys(parsed)).toEqual(['phone']);
      expect(parsed).not.toHaveProperty('facilities');
      expect(parsed).not.toHaveProperty('images');
      expect(parsed).not.toHaveProperty('openingHours');
      expect(parsed).not.toHaveProperty('womenOnlyWindows');
      expect(parsed).not.toHaveProperty('sortOrder');
      expect(parsed).not.toHaveProperty('isActive');
    });

    it('parses an empty patch to an empty object', () => {
      expect(updateBranchSchema.parse({})).toEqual({});
    });

    it('still applies an explicitly sent empty array', () => {
      // Clearing a list is a legitimate edit and must survive the filtering.
      const parsed = updateBranchSchema.parse({ facilities: [] });
      expect(parsed.facilities).toEqual([]);
    });

    it('still validates the fields it is given', () => {
      expect(() => updateBranchSchema.parse({ governorate: 'Atlantis' })).toThrow();
      expect(() => updateBranchSchema.parse({ latitude: 200 })).toThrow();
    });
  });
});

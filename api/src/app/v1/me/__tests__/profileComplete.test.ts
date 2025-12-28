import test from 'node:test';
import assert from 'node:assert/strict';

// Import the checkProfileComplete function logic to test
// Since the function is private in route.ts, we test the logic directly

type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type UserProfile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
};

/**
 * Check if a parent profile has all required fields completed.
 * This mirrors the checkProfileComplete function in route.ts
 */
function checkProfileComplete(profile: UserProfile): boolean {
  // Check firstName
  if (!profile.firstName || profile.firstName.trim().length === 0) {
    return false;
  }
  // Check lastName
  if (!profile.lastName || profile.lastName.trim().length === 0) {
    return false;
  }
  // Check phone (at least 10 digits)
  if (!profile.phone || profile.phone.trim().length < 10) {
    return false;
  }
  // Check address fields
  const address = profile.address;
  if (!address) {
    return false;
  }
  if (!address.street || address.street.trim().length === 0) {
    return false;
  }
  if (!address.city || address.city.trim().length === 0) {
    return false;
  }
  if (!address.state || address.state.trim().length === 0) {
    return false;
  }
  if (!address.zip || address.zip.trim().length === 0) {
    return false;
  }
  return true;
}

test('checkProfileComplete: returns false when firstName is missing', () => {
  const profile: UserProfile = {
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when lastName is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when phone is too short', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-1234', // Only 7 digits
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when phone is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when address is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when address.street is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when address.city is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: '', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when address.state is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: '', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns false when address.zip is missing', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: returns true when all required fields are present', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), true);
});

test('checkProfileComplete: returns true with formatted phone number', () => {
  const profile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-123-4567', // Formatted with dashes, still 10 digits
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  // Note: the current implementation checks string length, not digit count
  // This test documents the current behavior
  assert.equal(checkProfileComplete(profile), true);
});

test('checkProfileComplete: handles whitespace-only values as empty', () => {
  const profile: UserProfile = {
    firstName: '   ',
    lastName: 'Doe',
    phone: '5551234567',
    address: { street: '123 Main St', city: 'San Diego', state: 'CA', zip: '92101' },
  };
  assert.equal(checkProfileComplete(profile), false);
});

test('checkProfileComplete: empty profile returns false', () => {
  const profile: UserProfile = {};
  assert.equal(checkProfileComplete(profile), false);
});

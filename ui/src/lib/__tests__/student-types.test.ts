import {
  createStudentSchema,
  updateStudentSchema,
  newStudentDefaults,
  genderOptions,
  COMMON_SCHOOL_DISTRICTS,
  type CreateStudentInput,
} from '../student-types';

describe('Student Types', () => {
  describe('createStudentSchema', () => {
    it('should validate a minimal valid student', () => {
      const input: CreateStudentInput = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2015-05-15',
        photoConsent: false,
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate a student with all fields', () => {
      const input: CreateStudentInput = {
        firstName: 'Arun',
        lastName: 'Kumar',
        dateOfBirth: '2016-03-20',
        gender: 'Boy',
        grade: '3rd Grade',
        schoolName: 'Poway Elementary',
        schoolDistrict: 'Poway Unified School District',
        priorTamilLevel: 'beginner',
        enrollingGrade: 'grade-3',
        address: {
          street: '12345 Main Street',
          city: 'San Diego',
          zipCode: '92128',
        },
        contacts: {
          mother: {
            name: 'Priya Kumar',
            email: 'priya@example.com',
            phone: '8585551234',
            employer: 'Tech Corp',
          },
          father: {
            name: 'Raj Kumar',
            email: 'raj@example.com',
            phone: '8585555678',
            employer: 'Finance Inc',
          },
        },
        medicalNotes: 'No allergies',
        photoConsent: true,
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('Boy');
        expect(result.data.schoolDistrict).toBe('Poway Unified School District');
        expect(result.data.address?.city).toBe('San Diego');
        expect(result.data.contacts?.mother?.email).toBe('priya@example.com');
      }
    });

    it('should reject missing required fields', () => {
      const input = {
        lastName: 'Doe',
        dateOfBirth: '2015-05-15',
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.firstName).toBeDefined();
      }
    });

    it('should reject invalid date format', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '05-15-2015', // Wrong format
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate gender enum values', () => {
      const validGenders = ['Boy', 'Girl', 'Other'];

      validGenders.forEach((gender) => {
        const input = {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '2015-01-01',
          gender,
        };
        const result = createStudentSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid gender value', () => {
      const input = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2015-01-01',
        gender: 'Invalid',
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow optional address with partial fields', () => {
      const input = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2015-01-01',
        address: {
          city: 'San Diego',
          // street and zipCode omitted
        },
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate parent contact email format', () => {
      const input = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2015-01-01',
        contacts: {
          mother: {
            email: 'invalid-email', // Invalid email
          },
        },
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow empty string for optional email', () => {
      const input = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2015-01-01',
        contacts: {
          mother: {
            name: 'Parent Name',
            email: '', // Empty is allowed
          },
        },
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should enforce field length limits', () => {
      const longString = 'a'.repeat(201); // Exceeds 200 char limit

      const input = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2015-01-01',
        schoolName: longString,
      };

      const result = createStudentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateStudentSchema', () => {
    it('should allow partial updates', () => {
      const input = {
        firstName: 'Updated Name',
      };

      const result = updateStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate gender on update', () => {
      const input = {
        gender: 'Girl',
      };

      const result = updateStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow updating address', () => {
      const input = {
        address: {
          street: 'New Address',
          city: 'New City',
          zipCode: '12345',
        },
      };

      const result = updateStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow updating contacts', () => {
      const input = {
        contacts: {
          mother: {
            phone: '1234567890',
          },
        },
      };

      const result = updateStudentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('newStudentDefaults', () => {
    it('should have all required default values', () => {
      expect(newStudentDefaults.firstName).toBe('');
      expect(newStudentDefaults.lastName).toBe('');
      expect(newStudentDefaults.dateOfBirth).toBe('');
      expect(newStudentDefaults.photoConsent).toBe(false);
    });

    it('should have new field defaults', () => {
      expect(newStudentDefaults.gender).toBeUndefined();
      expect(newStudentDefaults.schoolDistrict).toBe('');
      expect(newStudentDefaults.enrollingGrade).toBe('');
    });

    it('should have address object with empty values', () => {
      expect(newStudentDefaults.address).toBeDefined();
      expect(newStudentDefaults.address?.street).toBe('');
      expect(newStudentDefaults.address?.city).toBe('');
      expect(newStudentDefaults.address?.zipCode).toBe('');
    });

    it('should have contacts object with empty parent values', () => {
      expect(newStudentDefaults.contacts).toBeDefined();
      expect(newStudentDefaults.contacts?.mother?.name).toBe('');
      expect(newStudentDefaults.contacts?.mother?.email).toBe('');
      expect(newStudentDefaults.contacts?.father?.name).toBe('');
      expect(newStudentDefaults.contacts?.father?.email).toBe('');
    });
  });

  describe('genderOptions', () => {
    it('should have correct options', () => {
      expect(genderOptions).toHaveLength(4);
      expect(genderOptions[0].value).toBe('');
      expect(genderOptions[1].value).toBe('Boy');
      expect(genderOptions[2].value).toBe('Girl');
      expect(genderOptions[3].value).toBe('Other');
    });
  });

  describe('COMMON_SCHOOL_DISTRICTS', () => {
    it('should include major San Diego area districts', () => {
      expect(COMMON_SCHOOL_DISTRICTS).toContain('Poway Unified School District');
      expect(COMMON_SCHOOL_DISTRICTS).toContain('San Diego Unified School District');
      expect(COMMON_SCHOOL_DISTRICTS).toContain('Other');
    });

    it('should have Other as an option', () => {
      expect(COMMON_SCHOOL_DISTRICTS[COMMON_SCHOOL_DISTRICTS.length - 1]).toBe('Other');
    });
  });
});

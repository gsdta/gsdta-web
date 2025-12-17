/**
 * Test Data Factory for E2E Tests
 *
 * Creates test data via API endpoints and tracks entities for cleanup.
 * Cleanup is done via direct Firestore Admin SDK for reliability.
 *
 * Usage:
 *   const factory = new TestDataFactory('worker-0');
 *   await factory.initialize();
 *   const grade = await factory.createGrade({ name: 'Test Grade' });
 *   const cls = await factory.createClass(grade.id, { name: 'Test Class' });
 *   // ... run tests ...
 *   await factory.cleanup(); // Deletes all created entities
 */

import { ApiClient } from './apiClient';
import { initializeApp, cert, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Types for test data
export interface Grade {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  status: string;
}

export interface Class {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  status: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  grade?: string;
  status: string;
  parentId: string;
  parentEmail: string;
}

export interface CreateGradeInput {
  id?: string;
  name?: string;
  displayName?: string;
  displayOrder?: number;
}

export interface CreateClassInput {
  name?: string;
  day?: string;
  time?: string;
  capacity?: number;
  academicYear?: string;
}

export interface CreateStudentInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
  medicalNotes?: string;
  photoConsent?: boolean;
}

// Track created entities for cleanup
interface TrackedEntity {
  collection: string;
  id: string;
}

export class TestDataFactory {
  private workerId: string;
  private apiClient: ApiClient;
  private createdEntities: TrackedEntity[] = [];
  private db: Firestore | null = null;
  private firebaseApp: App | null = null;
  private counter = 0;

  constructor(workerId: string) {
    this.workerId = workerId;
    this.apiClient = new ApiClient();
  }

  /**
   * Initialize the factory - must be called before creating data
   */
  async initialize(): Promise<void> {
    // Initialize Firebase Admin for cleanup
    this.initializeFirebase();

    // Login as admin for API calls
    await this.apiClient.loginAsAdmin();
  }

  /**
   * Initialize Firebase Admin SDK for direct Firestore access (cleanup)
   */
  private initializeFirebase(): void {
    // Check if already initialized
    const existingApps = getApps();
    const appName = `test-cleanup-${this.workerId}`;
    const existingApp = existingApps.find(app => app.name === appName);

    if (existingApp) {
      this.firebaseApp = existingApp;
      this.db = getFirestore(existingApp);
      return;
    }

    // Set emulator environment
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8889';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

    // Initialize without credentials for emulator
    this.firebaseApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-gsdta',
    }, appName);

    this.db = getFirestore(this.firebaseApp);
  }

  /**
   * Generate a unique ID for test data
   */
  private generateId(prefix: string): string {
    this.counter++;
    return `w${this.workerId}-${prefix}-${Date.now()}-${this.counter}`;
  }

  /**
   * Track an entity for cleanup
   */
  private track(collection: string, id: string): void {
    this.createdEntities.push({ collection, id });
  }

  /**
   * Create a grade via API
   */
  async createGrade(input: CreateGradeInput = {}): Promise<Grade> {
    const id = input.id || this.generateId('grade');
    const name = input.name || `Test Grade ${this.counter}`;

    const response = await this.apiClient.post<{ grade: Grade }>('/api/v1/admin/grades', {
      id,
      name,
      displayName: input.displayName || name,
      displayOrder: input.displayOrder || 99,
    });

    if (!response.success || !response.data?.grade) {
      throw new Error(`Failed to create grade: ${response.message || 'Unknown error'}`);
    }

    this.track('grades', response.data.grade.id);
    return response.data.grade;
  }

  /**
   * Create a class via API
   */
  async createClass(gradeId: string, input: CreateClassInput = {}): Promise<Class> {
    const name = input.name || `Test Class ${this.counter}`;

    const response = await this.apiClient.post<{ class: Class }>('/api/v1/admin/classes', {
      name,
      gradeId,
      day: input.day || 'Saturday',
      time: input.time || '10:00 AM',
      capacity: input.capacity || 20,
      academicYear: input.academicYear || '2024-2025',
    });

    if (!response.success || !response.data?.class) {
      throw new Error(`Failed to create class: ${response.message || 'Unknown error'}`);
    }

    this.track('classes', response.data.class.id);
    return response.data.class;
  }

  /**
   * Create a student via API (as parent)
   */
  async createStudent(input: CreateStudentInput = {}): Promise<Student> {
    // Switch to parent role for student creation
    await this.apiClient.loginAsParent();

    const firstName = input.firstName || `TestFirst${this.counter}`;
    const lastName = input.lastName || `TestLast${this.counter}`;

    const response = await this.apiClient.post<{ student: Student }>('/api/v1/me/students', {
      firstName,
      lastName,
      dateOfBirth: input.dateOfBirth || '2015-01-15',
      grade: input.grade,
      schoolName: input.schoolName,
      priorTamilLevel: input.priorTamilLevel,
      medicalNotes: input.medicalNotes,
      photoConsent: input.photoConsent ?? true,
    });

    // Switch back to admin
    await this.apiClient.loginAsAdmin();

    if (!response.success || !response.data?.student) {
      throw new Error(`Failed to create student: ${response.message || 'Unknown error'}`);
    }

    this.track('students', response.data.student.id);
    return response.data.student;
  }

  /**
   * Create a student with admin-set status (e.g., 'active', 'admitted')
   */
  async createStudentWithStatus(
    input: CreateStudentInput = {},
    status: 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn' = 'active',
    classId?: string,
    className?: string
  ): Promise<Student> {
    // First create as parent (pending status)
    const student = await this.createStudent(input);

    // Then update as admin to set desired status
    const updateData: Record<string, unknown> = { status };
    if (classId) {
      updateData.classId = classId;
      updateData.className = className || classId;
    }

    const response = await this.apiClient.patch<{ student: Student }>(
      `/api/v1/admin/students/${student.id}`,
      updateData
    );

    if (!response.success || !response.data?.student) {
      throw new Error(`Failed to update student status: ${response.message || 'Unknown error'}`);
    }

    return response.data.student;
  }

  /**
   * Admit a student via API
   */
  async admitStudent(studentId: string): Promise<Student> {
    const response = await this.apiClient.post<{ student: Student }>(
      `/api/v1/admin/students/${studentId}/admit`,
      {}
    );

    if (!response.success || !response.data?.student) {
      throw new Error(`Failed to admit student: ${response.message || 'Unknown error'}`);
    }

    return response.data.student;
  }

  /**
   * Assign student to class via API
   */
  async assignStudentToClass(studentId: string, classId: string): Promise<Student> {
    const response = await this.apiClient.post<{ student: Student }>(
      `/api/v1/admin/students/${studentId}/assign-class`,
      { classId }
    );

    if (!response.success || !response.data?.student) {
      throw new Error(`Failed to assign student to class: ${response.message || 'Unknown error'}`);
    }

    return response.data.student;
  }

  /**
   * Assign a teacher to a class
   */
  async assignTeacherToClass(
    classId: string,
    teacherId: string,
    teacherName: string,
    role: 'primary' | 'assistant' = 'primary',
    teacherEmail?: string
  ): Promise<void> {
    const response = await this.apiClient.post<{ message: string }>(
      `/api/v1/admin/classes/${classId}/teachers`,
      {
        teacherId,
        teacherName,
        teacherEmail,
        role,
      }
    );

    if (!response.success) {
      throw new Error(`Failed to assign teacher to class: ${response.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the API client for custom operations
   */
  getApiClient(): ApiClient {
    return this.apiClient;
  }

  /**
   * Get list of all tracked entities
   */
  getTrackedEntities(): TrackedEntity[] {
    return [...this.createdEntities];
  }

  /**
   * Cleanup all created entities via direct Firestore delete
   * Entities are deleted in reverse order (LIFO) to handle dependencies
   */
  async cleanup(): Promise<void> {
    if (!this.db) {
      console.warn('Firestore not initialized, skipping cleanup');
      return;
    }

    if (this.createdEntities.length === 0) {
      return;
    }

    // Delete in reverse order (last created first)
    const toDelete = [...this.createdEntities].reverse();

    // Use batch for efficiency (max 500 operations per batch)
    const batchSize = 500;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = this.db.batch();
      const chunk = toDelete.slice(i, i + batchSize);

      for (const entity of chunk) {
        const docRef = this.db.collection(entity.collection).doc(entity.id);
        batch.delete(docRef);
      }

      try {
        await batch.commit();
      } catch (error) {
        console.error('Error during cleanup batch:', error);
        // Continue with remaining deletions
      }
    }

    // Clear tracked entities
    this.createdEntities = [];
  }

  /**
   * Destroy the factory and cleanup Firebase app
   */
  async destroy(): Promise<void> {
    await this.cleanup();

    if (this.firebaseApp) {
      try {
        await deleteApp(this.firebaseApp);
      } catch {
        // Ignore errors during app deletion
      }
      this.firebaseApp = null;
      this.db = null;
    }
  }
}

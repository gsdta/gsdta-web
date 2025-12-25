import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Volunteer,
  CreateVolunteerDto,
  UpdateVolunteerDto,
  VolunteerListFilters,
  VolunteerListResponse,
  VolunteerClassAssignment,
  LogVolunteerHoursDto,
  VolunteerView,
} from '@/types/volunteer';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const VOLUNTEERS_COLLECTION = 'volunteers';

/**
 * Create a new volunteer
 */
export async function createVolunteer(data: CreateVolunteerDto, adminId?: string): Promise<Volunteer> {
  const now = Timestamp.now();

  const volunteerData: Omit<Volunteer, 'id'> = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    type: data.type,
    school: data.school,
    gradeLevel: data.gradeLevel,
    parentId: data.parentId,
    studentIds: data.studentIds,
    availableDays: data.availableDays,
    availableTimes: data.availableTimes,
    academicYear: data.academicYear,
    emergencyContact: data.emergencyContact,
    notes: data.notes,
    classAssignments: [],
    status: 'active',
    totalHours: 0,
    hoursLog: [],
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };

  const docRef = await getDb().collection(VOLUNTEERS_COLLECTION).add(volunteerData);

  return {
    id: docRef.id,
    ...volunteerData,
  };
}

/**
 * Get a volunteer by ID
 */
export async function getVolunteerById(id: string): Promise<Volunteer | null> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
  } as Volunteer;
}

/**
 * Get all volunteers with filters
 */
export async function getAllVolunteers(filters: VolunteerListFilters = {}): Promise<VolunteerListResponse> {
  const { type, status = 'all', classId, academicYear, search, limit = 100, offset = 0 } = filters;

  let query = getDb().collection(VOLUNTEERS_COLLECTION) as FirebaseFirestore.Query;

  // Apply filters
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (type) {
    query = query.where('type', '==', type);
  }
  if (academicYear) {
    query = query.where('academicYear', '==', academicYear);
  }

  // Order by name
  query = query.orderBy('lastName', 'asc').orderBy('firstName', 'asc');

  const snap = await query.get();

  let volunteers = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Volunteer;
  });

  // Filter by classId (in memory since it's in an array)
  if (classId) {
    volunteers = volunteers.filter((v) =>
      v.classAssignments?.some((a) => a.classId === classId)
    );
  }

  // Apply search filter in memory
  if (search) {
    const searchLower = search.toLowerCase();
    volunteers = volunteers.filter(
      (v) =>
        v.firstName.toLowerCase().includes(searchLower) ||
        v.lastName.toLowerCase().includes(searchLower) ||
        (v.email?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  const total = volunteers.length;

  // Apply pagination
  const paginatedVolunteers = volunteers.slice(offset, offset + limit);

  return {
    volunteers: paginatedVolunteers,
    total,
  };
}

/**
 * Update a volunteer
 */
export async function updateVolunteer(id: string, data: UpdateVolunteerDto): Promise<Volunteer | null> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.school !== undefined) updateData.school = data.school;
  if (data.gradeLevel !== undefined) updateData.gradeLevel = data.gradeLevel;
  if (data.parentId !== undefined) updateData.parentId = data.parentId;
  if (data.studentIds !== undefined) updateData.studentIds = data.studentIds;
  if (data.availableDays !== undefined) updateData.availableDays = data.availableDays;
  if (data.availableTimes !== undefined) updateData.availableTimes = data.availableTimes;
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
  if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await doc.ref.update(updateData);

  return getVolunteerById(id);
}

/**
 * Delete a volunteer (soft delete by setting status to inactive)
 */
export async function deleteVolunteer(id: string): Promise<boolean> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return false;

  await doc.ref.update({
    status: 'inactive',
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Assign a volunteer to a class
 */
export async function assignVolunteerToClass(
  id: string,
  classId: string,
  className: string,
  gradeId: string,
  gradeName: string,
  adminId: string
): Promise<Volunteer | null> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const volunteer = doc.data() as Omit<Volunteer, 'id'>;

  // Check if already assigned to this class
  const existingAssignment = volunteer.classAssignments?.find((a) => a.classId === classId);
  if (existingAssignment) {
    return { id, ...volunteer } as Volunteer;
  }

  const newAssignment: VolunteerClassAssignment = {
    classId,
    className,
    gradeId,
    gradeName,
    assignedAt: Timestamp.now(),
    assignedBy: adminId,
  };

  const updatedAssignments = [...(volunteer.classAssignments || []), newAssignment];

  await doc.ref.update({
    classAssignments: updatedAssignments,
    updatedAt: Timestamp.now(),
  });

  return getVolunteerById(id);
}

/**
 * Remove a volunteer from a class
 */
export async function removeVolunteerFromClass(id: string, classId: string): Promise<Volunteer | null> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const volunteer = doc.data() as Omit<Volunteer, 'id'>;

  const updatedAssignments = (volunteer.classAssignments || []).filter(
    (a) => a.classId !== classId
  );

  await doc.ref.update({
    classAssignments: updatedAssignments,
    updatedAt: Timestamp.now(),
  });

  return getVolunteerById(id);
}

/**
 * Log volunteer hours
 */
export async function logVolunteerHours(
  id: string,
  data: LogVolunteerHoursDto,
  verifiedBy?: string
): Promise<Volunteer | null> {
  const doc = await getDb().collection(VOLUNTEERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const volunteer = doc.data() as Omit<Volunteer, 'id'>;

  const newLogEntry = {
    date: data.date,
    hours: data.hours,
    classId: data.classId,
    notes: data.notes,
    verifiedBy,
  };

  const updatedLog = [...(volunteer.hoursLog || []), newLogEntry];
  const totalHours = updatedLog.reduce((sum, entry) => sum + entry.hours, 0);

  await doc.ref.update({
    hoursLog: updatedLog,
    totalHours,
    updatedAt: Timestamp.now(),
  });

  return getVolunteerById(id);
}

/**
 * Get volunteers by class ID
 */
export async function getVolunteersByClass(classId: string): Promise<VolunteerView[]> {
  const { volunteers } = await getAllVolunteers({ classId, status: 'active' });

  return volunteers.map((v) => ({
    id: v.id,
    firstName: v.firstName,
    lastName: v.lastName,
    name: `${v.firstName} ${v.lastName}`,
    type: v.type,
    typeLabel: getVolunteerTypeLabel(v.type),
    email: v.email,
    phone: v.phone,
    status: v.status,
  }));
}

/**
 * Get human-readable volunteer type label
 */
function getVolunteerTypeLabel(type: string): string {
  switch (type) {
    case 'high_school':
      return 'High School Volunteer';
    case 'parent':
      return 'Parent Volunteer';
    case 'community':
      return 'Community Volunteer';
    default:
      return 'Volunteer';
  }
}

/**
 * Count volunteers by type
 */
export async function countVolunteersByType(): Promise<Record<string, number>> {
  const types = ['high_school', 'parent', 'community'] as const;
  const counts: Record<string, number> = {};

  for (const type of types) {
    const snap = await getDb()
      .collection(VOLUNTEERS_COLLECTION)
      .where('type', '==', type)
      .where('status', '==', 'active')
      .count()
      .get();
    counts[type] = snap.data().count;
  }

  return counts;
}

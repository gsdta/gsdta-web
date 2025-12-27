import { AuthError } from './auth';
import { getClassById } from './firestoreClasses';
import type { Class, ClassTeacher } from '@/types/class';

/**
 * Result of teacher assignment verification
 */
export interface TeacherAssignmentResult {
  isAssigned: boolean;
  role: 'primary' | 'assistant' | null;
  classData: Class | null;
}

/**
 * Check if a teacher is assigned to a specific class
 *
 * @param teacherUid - The teacher's user UID
 * @param classId - The class ID to check
 * @returns TeacherAssignmentResult with assignment details
 */
export async function checkTeacherAssignment(
  teacherUid: string,
  classId: string
): Promise<TeacherAssignmentResult> {
  const classData = await getClassById(classId);

  if (!classData) {
    return { isAssigned: false, role: null, classData: null };
  }

  const teachers = classData.teachers || [];
  const teacherAssignment = teachers.find((t: ClassTeacher) => t.teacherId === teacherUid);

  if (!teacherAssignment) {
    // Also check legacy teacherId field for backward compatibility
    if (classData.teacherId === teacherUid) {
      return { isAssigned: true, role: 'primary', classData };
    }
    return { isAssigned: false, role: null, classData };
  }

  return {
    isAssigned: true,
    role: teacherAssignment.role,
    classData,
  };
}

/**
 * Verify that a teacher is assigned to a class
 * Throws AuthError if not assigned
 *
 * @param teacherUid - The teacher's user UID
 * @param classId - The class ID to verify
 * @returns The class data and teacher's role
 * @throws AuthError with 403 status if teacher is not assigned
 * @throws AuthError with 404 status if class is not found
 */
export async function verifyTeacherAssignment(
  teacherUid: string,
  classId: string
): Promise<{ classData: Class; role: 'primary' | 'assistant' }> {
  const result = await checkTeacherAssignment(teacherUid, classId);

  if (!result.classData) {
    throw new AuthError(404, 'class/not-found', 'Class not found');
  }

  if (!result.isAssigned || !result.role) {
    throw new AuthError(
      403,
      'auth/forbidden',
      'You are not assigned to this class'
    );
  }

  return { classData: result.classData, role: result.role };
}

/**
 * Get all classes assigned to a teacher
 *
 * @param teacherUid - The teacher's user UID
 * @param classes - Array of classes to search through
 * @returns Array of classes where the teacher is assigned
 */
export function getTeacherClasses(
  teacherUid: string,
  classes: Class[]
): Array<Class & { teacherRole: 'primary' | 'assistant' }> {
  return classes
    .filter((cls) => {
      const teachers = cls.teachers || [];
      const isAssigned = teachers.some((t: ClassTeacher) => t.teacherId === teacherUid);
      // Also check legacy teacherId field
      return isAssigned || cls.teacherId === teacherUid;
    })
    .map((cls) => {
      const teachers = cls.teachers || [];
      const assignment = teachers.find((t: ClassTeacher) => t.teacherId === teacherUid);
      return {
        ...cls,
        teacherRole: assignment?.role || 'primary', // Legacy assignments are primary
      };
    });
}

/**
 * Check if a teacher has primary role in a class
 *
 * @param teacherUid - The teacher's user UID
 * @param classData - The class to check
 * @returns true if teacher is the primary teacher
 */
export function isPrimaryTeacher(teacherUid: string, classData: Class): boolean {
  const teachers = classData.teachers || [];
  const assignment = teachers.find((t: ClassTeacher) => t.teacherId === teacherUid);

  if (assignment) {
    return assignment.role === 'primary';
  }

  // Legacy support
  return classData.teacherId === teacherUid;
}

/**
 * Verify that a student is in a teacher's assigned class
 *
 * @param teacherUid - The teacher's user UID
 * @param studentClassId - The class ID the student is enrolled in
 * @returns true if teacher is assigned to the student's class
 */
export async function verifyTeacherStudentAccess(
  teacherUid: string,
  studentClassId: string | undefined | null
): Promise<boolean> {
  if (!studentClassId) {
    return false;
  }

  const result = await checkTeacherAssignment(teacherUid, studentClassId);
  return result.isAssigned;
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guard';
import { AuthError } from '@/lib/auth';
import { getClassById } from '@/lib/firestoreClasses';
import { getStudentsByClassId } from '@/lib/firestoreStudents';

/**
 * GET /api/v1/teacher/classes/[id]/roster
 * Get student roster for a class (teacher must be assigned to class)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request.headers.get('authorization'), {
      requireRoles: ['teacher', 'admin'],
    });

    const { id: classId } = await params;
    const teacherId = auth.profile.uid;

    // Get class
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Verify teacher is assigned to this class (unless admin)
    const isAdmin = auth.profile.roles?.includes('admin');
    const isAssigned =
      classDoc.teachers.some((t) => t.teacherId === teacherId) ||
      classDoc.teacherId === teacherId;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this class' },
        { status: 403 }
      );
    }

    // Get enrolled students
    const students = await getStudentsByClassId(classId);

    // Sort students by lastName, firstName
    students.sort((a, b) => {
      const lastNameCmp = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCmp !== 0) return lastNameCmp;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });

    return NextResponse.json({
      success: true,
      data: {
        class: {
          id: classDoc.id,
          name: classDoc.name,
          gradeId: classDoc.gradeId,
          gradeName: classDoc.gradeName,
          day: classDoc.day,
          time: classDoc.time,
          capacity: classDoc.capacity,
          enrolled: classDoc.enrolled,
          academicYear: classDoc.academicYear,
        },
        students: students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: `${s.firstName} ${s.lastName}`,
          status: s.status,
        })),
        total: students.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('Error fetching class roster:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch class roster' },
      { status: 500 }
    );
  }
}

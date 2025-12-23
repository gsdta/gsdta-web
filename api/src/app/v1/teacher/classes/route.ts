import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guard';
import { AuthError } from '@/lib/auth';
import { getAllClasses } from '@/lib/firestoreClasses';

/**
 * GET /api/v1/teacher/classes
 * Get all classes assigned to the authenticated teacher
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request.headers.get('authorization'), {
      requireRoles: ['teacher', 'admin'],
    });

    const teacherId = auth.profile.uid;

    // Get all active classes where this teacher is assigned
    const { classes } = await getAllClasses({
      status: 'active',
      teacherId: teacherId,
    });

    // Filter to only classes where this teacher is assigned (double-check)
    const myClasses = classes.filter(
      (cls) =>
        cls.teachers.some((t) => t.teacherId === teacherId) ||
        cls.teacherId === teacherId // Legacy support
    );

    // Sort by day, then time
    const dayOrder: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    myClasses.sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 7) - (dayOrder[b.day] ?? 7);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });

    return NextResponse.json({
      success: true,
      data: {
        classes: myClasses.map((cls) => ({
          id: cls.id,
          name: cls.name,
          gradeId: cls.gradeId,
          gradeName: cls.gradeName,
          day: cls.day,
          time: cls.time,
          capacity: cls.capacity,
          enrolled: cls.enrolled,
          academicYear: cls.academicYear,
          status: cls.status,
          // Find teacher's role in this class
          myRole:
            cls.teachers.find((t) => t.teacherId === teacherId)?.role ||
            (cls.teacherId === teacherId ? 'primary' : null),
        })),
        total: myClasses.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { corsHeaders } from '@/lib/cors';
import {
  getClassById,
  assignTeacherToClass,
  removeTeacherFromClass,
  updateTeacherRole,
  getClassTeachers,
} from '@/lib/firestoreClasses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string, origin: string | null) {
  const res = NextResponse.json({ success: false, code, message }, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Validation schemas
const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  teacherName: z.string().min(1, 'Teacher name is required'),
  teacherEmail: z.string().email().optional(),
  role: z.enum(['primary', 'assistant']),
});

const removeTeacherSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
});

const updateRoleSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  role: z.enum(['primary', 'assistant']),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/admin/classes/{id}/teachers
 * Get all teachers assigned to a class
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id: classId } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    // Check if class exists
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    const teachers = await getClassTeachers(classId);

    // Format teachers for response
    const formattedTeachers = teachers.map((t) => ({
      ...t,
      assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const response = {
      success: true,
      data: {
        classId,
        teachers: formattedTeachers,
        total: formattedTeachers.length,
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error fetching class teachers:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch class teachers', origin);
  }
}

/**
 * POST /api/v1/admin/classes/{id}/teachers
 * Assign a teacher to a class
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id: classId } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = assignTeacherSchema.parse(body);

    // Check if class exists
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    const updatedClass = await assignTeacherToClass(
      classId,
      {
        teacherId: validData.teacherId,
        teacherName: validData.teacherName,
        teacherEmail: validData.teacherEmail,
        role: validData.role,
      },
      profile.uid
    );

    if (!updatedClass) {
      return jsonError(500, 'internal/error', 'Failed to assign teacher', origin);
    }

    // Format teachers for response
    const formattedTeachers = (updatedClass.teachers || []).map((t) => ({
      ...t,
      assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const response = {
      success: true,
      data: {
        message: 'Teacher assigned successfully',
        classId,
        teachers: formattedTeachers,
      },
    };

    const res = NextResponse.json(response, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    if (err instanceof Error && err.message.includes('already assigned')) {
      return jsonError(400, 'teacher/already-assigned', err.message, origin);
    }
    console.error('Error assigning teacher:', err);
    return jsonError(500, 'internal/error', 'Failed to assign teacher', origin);
  }
}

/**
 * DELETE /api/v1/admin/classes/{id}/teachers
 * Remove a teacher from a class
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id: classId } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = removeTeacherSchema.parse(body);

    // Check if class exists
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    const updatedClass = await removeTeacherFromClass(classId, validData.teacherId);

    if (!updatedClass) {
      return jsonError(500, 'internal/error', 'Failed to remove teacher', origin);
    }

    // Format teachers for response
    const formattedTeachers = (updatedClass.teachers || []).map((t) => ({
      ...t,
      assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const response = {
      success: true,
      data: {
        message: 'Teacher removed successfully',
        classId,
        teachers: formattedTeachers,
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    if (err instanceof Error && err.message.includes('not assigned')) {
      return jsonError(400, 'teacher/not-assigned', err.message, origin);
    }
    console.error('Error removing teacher:', err);
    return jsonError(500, 'internal/error', 'Failed to remove teacher', origin);
  }
}

/**
 * PATCH /api/v1/admin/classes/{id}/teachers
 * Update a teacher's role in a class
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id: classId } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = updateRoleSchema.parse(body);

    // Check if class exists
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return jsonError(404, 'class/not-found', 'Class not found', origin);
    }

    const updatedClass = await updateTeacherRole(classId, validData.teacherId, validData.role);

    if (!updatedClass) {
      return jsonError(500, 'internal/error', 'Failed to update teacher role', origin);
    }

    // Format teachers for response
    const formattedTeachers = (updatedClass.teachers || []).map((t) => ({
      ...t,
      assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const response = {
      success: true,
      data: {
        message: 'Teacher role updated successfully',
        classId,
        teachers: formattedTeachers,
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    if (err instanceof Error && err.message.includes('not assigned')) {
      return jsonError(400, 'teacher/not-assigned', err.message, origin);
    }
    console.error('Error updating teacher role:', err);
    return jsonError(500, 'internal/error', 'Failed to update teacher role', origin);
  }
}

/**
 * Data Export Library
 *
 * System-wide data export for compliance and backup purposes.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logSuperAdminAction } from './auditLog';

export type ExportType = 'full' | 'users' | 'students' | 'audit' | 'classes';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ExportJob = {
  id: string;
  type: ExportType;
  status: ExportStatus;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
  metadata?: {
    recordCount?: number;
    fileSize?: number;
    collections?: string[];
  };
};

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setDataExportDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const EXPORT_EXPIRY_HOURS = 24; // Export downloads expire after 24 hours

/**
 * Create a new export job
 */
export async function createExportJob(
  type: ExportType,
  requestedBy: string,
  requestedByEmail: string
): Promise<ExportJob> {
  const db = getDb();
  const ref = db.collection('exportJobs').doc();

  const jobData = {
    type,
    status: 'pending' as ExportStatus,
    requestedBy,
    requestedByEmail,
    requestedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(jobData);

  // Log to audit
  await logSuperAdminAction(
    requestedBy,
    requestedByEmail,
    'export.create',
    'exportJobs',
    ref.id,
    {
      metadata: {
        exportType: type,
      },
    },
    { severity: 'info' }
  );

  return {
    id: ref.id,
    type,
    status: 'pending',
    requestedBy,
    requestedByEmail,
    requestedAt: new Date(),
  };
}

/**
 * Get export job by ID
 */
export async function getExportJob(jobId: string): Promise<ExportJob | null> {
  const db = getDb();
  const doc = await db.collection('exportJobs').doc(jobId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type,
    status: data.status,
    requestedBy: data.requestedBy,
    requestedByEmail: data.requestedByEmail,
    requestedAt: data.requestedAt?.toDate?.() ?? new Date(),
    startedAt: data.startedAt?.toDate?.(),
    completedAt: data.completedAt?.toDate?.(),
    downloadUrl: data.downloadUrl,
    expiresAt: data.expiresAt?.toDate?.(),
    error: data.error,
    metadata: data.metadata,
  };
}

/**
 * List export jobs
 */
export async function listExportJobs(options: {
  limit?: number;
  status?: ExportStatus;
}): Promise<ExportJob[]> {
  const db = getDb();
  let query = db.collection('exportJobs').orderBy('requestedAt', 'desc');

  if (options.status) {
    query = query.where('status', '==', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      status: data.status,
      requestedBy: data.requestedBy,
      requestedByEmail: data.requestedByEmail,
      requestedAt: data.requestedAt?.toDate?.() ?? new Date(),
      startedAt: data.startedAt?.toDate?.(),
      completedAt: data.completedAt?.toDate?.(),
      downloadUrl: data.downloadUrl,
      expiresAt: data.expiresAt?.toDate?.(),
      error: data.error,
      metadata: data.metadata,
    };
  });
}

/**
 * Process an export job (generates the export data)
 * In a production system, this would be a background job/Cloud Function
 */
export async function processExportJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const jobRef = db.collection('exportJobs').doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return { success: false, error: 'Export job not found' };
  }

  const jobData = jobDoc.data()!;

  if (jobData.status !== 'pending') {
    return { success: false, error: 'Export job is not in pending status' };
  }

  // Update status to processing
  await jobRef.update({
    status: 'processing',
    startedAt: FieldValue.serverTimestamp(),
  });

  try {
    // Collect data based on export type
    const exportData = await collectExportData(jobData.type);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EXPORT_EXPIRY_HOURS);

    // In production, this would upload to Cloud Storage and generate a signed URL
    // For now, we'll store a reference and the data count
    const downloadUrl = `/api/v1/super-admin/export/${jobId}/download`;

    await jobRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      downloadUrl,
      expiresAt: Timestamp.fromDate(expiresAt),
      metadata: {
        recordCount: exportData.totalRecords,
        collections: exportData.collections,
      },
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await jobRef.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Collect data for export based on type
 */
async function collectExportData(type: ExportType): Promise<{
  data: Record<string, unknown[]>;
  collections: string[];
  totalRecords: number;
}> {
  const db = getDb();
  const data: Record<string, unknown[]> = {};
  const collections: string[] = [];
  let totalRecords = 0;

  const collectCollection = async (collectionName: string) => {
    const snapshot = await db.collection(collectionName).get();
    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    data[collectionName] = docs;
    collections.push(collectionName);
    totalRecords += docs.length;
  };

  switch (type) {
    case 'full':
      await collectCollection('users');
      await collectCollection('students');
      await collectCollection('classes');
      await collectCollection('grades');
      await collectCollection('attendance');
      await collectCollection('roleInvites');
      break;

    case 'users':
      await collectCollection('users');
      break;

    case 'students':
      await collectCollection('students');
      break;

    case 'audit':
      await collectCollection('auditLog');
      await collectCollection('adminPromotions');
      await collectCollection('securityEvents');
      break;

    case 'classes':
      await collectCollection('classes');
      await collectCollection('grades');
      await collectCollection('attendance');
      break;
  }

  return { data, collections, totalRecords };
}

/**
 * Generate export file content (JSON format)
 */
export async function generateExportContent(jobId: string): Promise<{
  success: boolean;
  content?: string;
  filename?: string;
  error?: string;
}> {
  const job = await getExportJob(jobId);

  if (!job) {
    return { success: false, error: 'Export job not found' };
  }

  if (job.status !== 'completed') {
    return { success: false, error: 'Export is not complete' };
  }

  if (job.expiresAt && new Date() > job.expiresAt) {
    return { success: false, error: 'Export has expired' };
  }

  const exportData = await collectExportData(job.type);

  const content = JSON.stringify(
    {
      exportInfo: {
        type: job.type,
        exportedAt: new Date().toISOString(),
        exportedBy: job.requestedByEmail,
        collections: exportData.collections,
        totalRecords: exportData.totalRecords,
      },
      data: exportData.data,
    },
    null,
    2
  );

  const filename = `gsdta-export-${job.type}-${new Date().toISOString().split('T')[0]}.json`;

  return { success: true, content, filename };
}

/**
 * Cancel a pending export job
 */
export async function cancelExportJob(
  jobId: string,
  cancelledBy: string,
  cancelledByEmail: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const jobRef = db.collection('exportJobs').doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return { success: false, error: 'Export job not found' };
  }

  const jobData = jobDoc.data()!;

  if (jobData.status !== 'pending') {
    return { success: false, error: 'Can only cancel pending exports' };
  }

  await jobRef.update({
    status: 'failed',
    completedAt: FieldValue.serverTimestamp(),
    error: 'Cancelled by user',
  });

  // Log to audit
  await logSuperAdminAction(
    cancelledBy,
    cancelledByEmail,
    'export.cancel',
    'exportJobs',
    jobId,
    {
      metadata: {
        exportType: jobData.type,
      },
    },
    { severity: 'info' }
  );

  return { success: true };
}

import { createClient } from '@supabase/supabase-js';
import { createAuditLog, getClientInfo } from './audit-log';
import { headers } from 'next/headers';


// Create admin client for audit logs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generic function to log any API action
export async function logAPIAction(
  action: string,
  resourceType: string,
  resourceId: string | undefined,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    const headersList = await headers();
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action,
      resourceType,
      resourceId,
      description,
      metadata,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  } catch (error) {
    console.error('Error logging API action:', error);
  }
}

// Specific helpers for common operations
export async function logUpdateAction(
  resourceType: string,
  resourceId: string,
  changes: Record<string, any>,
  previousState?: Record<string, any>
) {
  const changedFields = Object.keys(changes);
  
  return logAPIAction(
    `update_${resourceType.toLowerCase()}`,
    resourceType,
    resourceId,
    `Updated ${resourceType.toLowerCase()} ${resourceId}: ${changedFields.join(', ')}`,
    {
      resourceId,
      changedFields,
      newValues: changes,
      previousValues: previousState,
      timestamp: new Date().toISOString(),
    }
  );
}

export async function logCreateAction(
  resourceType: string,
  resourceId: string,
  data: Record<string, any>
) {
  return logAPIAction(
    `create_${resourceType.toLowerCase()}`,
    resourceType,
    resourceId,
    `Created new ${resourceType.toLowerCase()} ${resourceId}`,
    {
      resourceId,
      createdData: data,
      timestamp: new Date().toISOString(),
    }
  );
}

export async function logDeleteAction(
  resourceType: string,
  resourceId: string,
  deletedData?: Record<string, any>
) {
  return logAPIAction(
    `delete_${resourceType.toLowerCase()}`,
    resourceType,
    resourceId,
    `Deleted ${resourceType.toLowerCase()} ${resourceId}`,
    {
      resourceId,
      deletedData,
      timestamp: new Date().toISOString(),
    }
  );
}
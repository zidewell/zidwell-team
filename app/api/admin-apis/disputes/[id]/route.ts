// app/api/admin-apis/disputes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { dispatchBulkNotifications } from '@/lib/notification-service';
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch specific dispute
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);
    const params = await context.params;
    const disputeId = params.id;

    // Fetch dispute with related data
    const { data: dispute, error } = await supabase
      .from('disputes')
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name
        ),
        admin_users:admin_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', disputeId)
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track failed dispute access
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_access_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to access dispute ${disputeId}: Not found`,
        metadata: {
          disputeId,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // 🕵️ AUDIT LOG: Track dispute access
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "view_dispute_details",
      resourceType: "Dispute",
      resourceId: disputeId,
      description: `Viewed details of dispute ${disputeId}: ${dispute.title || 'Untitled'}`,
      metadata: {
        disputeId,
        disputeTitle: dispute.title,
        disputeStatus: dispute.status,
        disputePriority: dispute.priority,
        userId: dispute.user_id,
        userEmail: dispute.users?.email,
        adminAssigned: dispute.admin_id,
        createdAt: dispute.created_at,
        accessedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      dispute,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('GET dispute error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_details_error",
        resourceType: "Dispute",
        description: `Unexpected error accessing dispute details: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update dispute
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);
    const params = await context.params;
    const disputeId = params.id;
    const body = await request.json();

    // Get current dispute state for audit log
    const { data: currentDispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent dispute
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_update_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to update dispute ${disputeId}: Not found`,
        metadata: {
          disputeId,
          attemptedUpdates: body,
          error: fetchError.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Update dispute
    const { data: dispute, error } = await supabase
      .from('disputes')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
        updated_by: adminUser?.id
      })
      .eq('id', disputeId)
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_update_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to update dispute ${disputeId}: ${error.message}`,
        metadata: {
          disputeId,
          disputeTitle: currentDispute.title,
          attemptedUpdates: body,
          previousStatus: currentDispute.status,
          error: error.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 🕵️ AUDIT LOG: Track successful dispute update
    const changedFields = Object.keys(body).filter(key => 
      key !== 'updated_at' && key !== 'updated_by'
    );
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_dispute",
      resourceType: "Dispute",
      resourceId: disputeId,
      description: `Updated dispute ${disputeId}: ${changedFields.join(', ')}`,
      metadata: {
        disputeId,
        disputeTitle: currentDispute.title,
        changedFields,
        previousValues: currentDispute,
        newValues: dispute,
        updatedBy: adminUser?.email,
        userAffected: dispute.users?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for status changes
    if (body.status && body.status !== currentDispute.status) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: `dispute_status_${body.status}`,
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Dispute ${disputeId} status changed from ${currentDispute.status} to ${body.status}`,
        metadata: {
          disputeId,
          disputeTitle: currentDispute.title,
          previousStatus: currentDispute.status,
          newStatus: body.status,
          userEmail: dispute.users?.email,
          changedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for assignment changes
    if (body.admin_id !== undefined && body.admin_id !== currentDispute.admin_id) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reassign_dispute",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Reassigned dispute ${disputeId} to admin ${body.admin_id}`,
        metadata: {
          disputeId,
          disputeTitle: currentDispute.title,
          previousAdmin: currentDispute.admin_id,
          newAdmin: body.admin_id,
          reassignedBy: adminUser?.email,
          userEmail: dispute.users?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for priority changes
    if (body.priority && body.priority !== currentDispute.priority) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "change_dispute_priority",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Dispute ${disputeId} priority changed from ${currentDispute.priority} to ${body.priority}`,
        metadata: {
          disputeId,
          disputeTitle: currentDispute.title,
          previousPriority: currentDispute.priority,
          newPriority: body.priority,
          changedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Send notification if status changed
    if (body.status && dispute.user_id) {
      await dispatchBulkNotifications({
        userIds: [dispute.user_id],
        title: 'Dispute Updated',
        message: `Your dispute #${disputeId} status has been updated to ${body.status}`,
        type: 'info'
      });
    }

    return NextResponse.json({ 
      dispute,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
  } catch (error: any) {
    console.error('PUT dispute error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_update_error",
        resourceType: "Dispute",
        description: `Unexpected error during dispute update: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove dispute
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);
    const params = await context.params;
    const disputeId = params.id;

    // Get dispute before deletion for audit log and notification
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent dispute
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_delete_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to delete dispute ${disputeId}: Not found`,
        metadata: {
          disputeId,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Delete dispute
    const { error } = await supabase
      .from('disputes')
      .delete()
      .eq('id', disputeId);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_delete_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to delete dispute ${disputeId}: ${error.message}`,
        metadata: {
          disputeId,
          disputeTitle: dispute.title,
          disputeStatus: dispute.status,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 🕵️ AUDIT LOG: Track successful dispute deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_dispute",
      resourceType: "Dispute",
      resourceId: disputeId,
      description: `Deleted dispute ${disputeId}: ${dispute.title || 'Untitled'}`,
      metadata: {
        disputeId,
        disputeTitle: dispute.title,
        disputeStatus: dispute.status,
        disputePriority: dispute.priority,
        userId: dispute.user_id,
        createdAt: dispute.created_at,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Send notification if user exists
    if (dispute?.user_id) {
      await dispatchBulkNotifications({
        userIds: [dispute.user_id],
        title: 'Dispute Resolved',
        message: `Your dispute #${disputeId} has been resolved and closed`,
        type: 'success'
      });
    }

    return NextResponse.json({ 
      message: 'Dispute deleted successfully',
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
  } catch (error: any) {
    console.error('DELETE dispute error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_delete_error",
        resourceType: "Dispute",
        description: `Unexpected error during dispute deletion: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Partial update (e.g., resolve dispute)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);
    const params = await context.params;
    const disputeId = params.id;
    const body = await request.json();

    // Get current dispute state for audit log
    const { data: currentDispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track resolution attempt on non-existent dispute
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_resolve_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to resolve dispute ${disputeId}: Not found`,
        metadata: {
          disputeId,
          resolutionNotes: body.resolution_notes,
          error: fetchError.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Resolve dispute
    const { data: dispute, error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: adminUser?.id,
        resolution_notes: body.resolution_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', disputeId)
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track resolution failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_resolve_failed",
        resourceType: "Dispute",
        resourceId: disputeId,
        description: `Failed to resolve dispute ${disputeId}: ${error.message}`,
        metadata: {
          disputeId,
          disputeTitle: currentDispute.title,
          resolutionNotes: body.resolution_notes,
          previousStatus: currentDispute.status,
          error: error.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 🕵️ AUDIT LOG: Track dispute resolution
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "resolve_dispute",
      resourceType: "Dispute",
      resourceId: disputeId,
      description: `Resolved dispute ${disputeId}: ${currentDispute.title || 'Untitled'}`,
      metadata: {
        disputeId,
        disputeTitle: currentDispute.title,
        previousStatus: currentDispute.status,
        resolutionNotes: body.resolution_notes,
        resolvedBy: adminUser?.email,
        userEmail: dispute.users?.email,
        resolutionTime: new Date().toISOString(),
        priority: currentDispute.priority
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Send notification to user
    if (dispute.user_id) {
      await dispatchBulkNotifications({
        userIds: [dispute.user_id],
        title: 'Dispute Resolved',
        message: `Your dispute #${disputeId} has been resolved. ${body.resolution_notes || ''}`,
        type: 'success'
      });
    }

    return NextResponse.json({ 
      dispute,
      message: 'Dispute resolved successfully',
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
  } catch (error: any) {
    console.error('PATCH dispute error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_resolve_error",
        resourceType: "Dispute",
        description: `Unexpected error during dispute resolution: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
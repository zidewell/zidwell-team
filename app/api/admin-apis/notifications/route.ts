// app/api/admin/notifications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to extract admin user info from cookies
async function getAdminUserInfo(cookieHeader: string) {
  try {
    // Extract access token from cookies
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (!accessTokenMatch) return null;

    const accessToken = accessTokenMatch[1];
    
    // Verify the token and get user info
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.error('Error getting admin user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error extracting admin user info:', error);
    return null;
  }
}

async function sendNotificationToUsers({
  title,
  message,
  type,
  target_audience,
  admin_notification_id,
  adminUser
}: {
  title: string;
  message: string;
  type: string;
  target_audience: string;
  admin_notification_id: string;
  adminUser: any;
}) {
  try {
    console.log('=== START: sendNotificationToUsers ===');
    console.log('Title:', title);
    console.log('Target audience:', target_audience);
    
    let userQuery = supabase
      .from('users')
      .select('id, email, first_name, last_name');

    switch (target_audience) {
      case 'premium_users':
        userQuery = userQuery.eq('subscription_tier', 'premium');
        break;
      case 'new_users':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        userQuery = userQuery.gte('created_at', thirtyDaysAgo.toISOString());
        break;
      case 'inactive_users':
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        userQuery = userQuery.lt('last_login', twoWeeksAgo.toISOString());
        break;
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users for target: ${target_audience}`);

    if (!users || users.length === 0) {
      throw new Error('No users found for the target audience');
    }

    const notifications = users.map(user => ({
      user_id: user.id,
      title,
      message,
      type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`Creating ${notifications.length} notifications...`);

    const { data, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (insertError) {
      console.error('Error creating notifications:', insertError);
      throw insertError;
    }

    console.log(`Successfully created ${data?.length || 0} notifications`);

    await supabase
      .from('admin_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        stats: {
          total_users: users.length,
          successful: data?.length || 0,
          failed: 0,
          users_notified: users.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}` }))
        }
      })
      .eq('id', admin_notification_id);

    console.log('=== END: sendNotificationToUsers - SUCCESS ===');
    return {
      success: true,
      total: users.length,
      successful: data?.length || 0,
      failed: 0
    };

  } catch (error) {
    console.error('=== END: sendNotificationToUsers - ERROR ===', error);
    
    await supabase
      .from('admin_notifications')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        sent_at: new Date().toISOString()
      })
      .eq('id', admin_notification_id);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const body = await req.json();
    const { 
      title, 
      message, 
      type = 'info',
      target_audience = 'all_users',
      is_urgent = false
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // 🕵️ AUDIT LOG: Track notification creation attempt
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_bulk_notification",
      resourceType: "Notification",
      description: `Creating bulk notification: "${title}" for ${target_audience}`,
      metadata: {
        title,
        messageLength: message.length,
        type,
        targetAudience: target_audience,
        isUrgent: is_urgent,
        createdBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    const { data: notification, error: notifError } = await supabase
      .from('admin_notifications')
      .insert({
        title,
        message,
        type,
        target_audience,
        is_urgent,
        status: 'sending',
        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (notifError) {
      console.error('Admin notification creation error:', notifError);
      
      // 🕵️ AUDIT LOG: Track notification creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_failed",
        resourceType: "Notification",
        description: `Failed to create bulk notification: "${title}" - ${notifError.message}`,
        metadata: {
          title,
          targetAudience: target_audience,
          error: notifError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw notifError;
    }

    console.log('Created admin notification with ID:', notification.id);

    const sendResult = await sendNotificationToUsers({
      title,
      message,
      type,
      target_audience,
      admin_notification_id: notification.id,
      adminUser
    });

    // 🕵️ AUDIT LOG: Track notification sending result
    if (sendResult.success) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "send_bulk_notification",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Sent bulk notification to ${sendResult.total} users: "${title}"`,
        metadata: {
          notificationId: notification.id,
          title,
          targetAudience: target_audience,
          totalUsers: sendResult.total,
          successful: sendResult.successful,
          failed: sendResult.failed,
          type,
          isUrgent: is_urgent,
          sentBy: adminUser?.email,
          sentAt: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    } else {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_delivery_failed",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Failed to deliver bulk notification: "${title}" - ${sendResult.error}`,
        metadata: {
          notificationId: notification.id,
          title,
          targetAudience: target_audience,
          error: sendResult.error,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    return NextResponse.json({ 
      success: sendResult.success, 
      notification: {
        ...notification,
        status: sendResult.success ? 'sent' : 'failed'
      },
      sendResult,
      message: sendResult.success ? 'Notification sent successfully' : 'Failed to send notification',
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Create notification error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "bulk_notification_error",
      resourceType: "Notification",
      description: `Unexpected error during bulk notification: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const range = searchParams.get('range');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('admin_notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (range && range !== 'total') {
      const date = new Date();
      switch (range) {
        case 'today':
          date.setHours(0, 0, 0, 0);
          query = query.gte('created_at', date.toISOString());
          break;
        case 'week':
          date.setDate(date.getDate() - 7);
          query = query.gte('created_at', date.toISOString());
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          query = query.gte('created_at', date.toISOString());
          break;
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      // 🕵️ AUDIT LOG: Track fetch failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notifications_fetch_failed",
        resourceType: "Notification",
        description: `Failed to fetch notifications: ${error.message}`,
        metadata: {
          page,
          limit,
          search,
          type,
          status,
          range,
          error: error.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw error;
    }

    // 🕵️ AUDIT LOG: Track notifications list access
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "view_notifications_list",
      resourceType: "Notification",
      description: `Viewed notifications list: page ${page}, ${notifications?.length || 0} results`,
      metadata: {
        page,
        limit,
        search,
        type,
        status,
        range,
        resultsCount: notifications?.length || 0,
        totalCount: count || 0,
        accessedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      page,
      limit,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "notifications_list_error",
      resourceType: "Notification",
      description: `Unexpected error fetching notifications: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const { data: existingNotification, error: fetchError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // 🕵️ AUDIT LOG: Track deletion attempt on non-existent notification
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "notification_delete_failed",
          resourceType: "Notification",
          resourceId: id,
          description: `Failed to delete notification ${id}: Not found`,
          metadata: {
            notificationId: id,
            error: "Notification not found",
            attemptedBy: adminUser?.email
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });

        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (existingNotification.status === 'sent') {
      // 🕵️ AUDIT LOG: Track unauthorized deletion attempt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notification_delete_attempt",
        resourceType: "Notification",
        resourceId: id,
        description: `Attempted to delete sent notification: "${existingNotification.title}"`,
        metadata: {
          notificationId: id,
          title: existingNotification.title,
          status: existingNotification.status,
          targetAudience: existingNotification.target_audience,
          sentAt: existingNotification.sent_at,
          attemptedBy: adminUser?.email,
          reason: "Cannot delete already sent notifications"
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: "Cannot delete already sent notifications" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notification_delete_failed",
        resourceType: "Notification",
        resourceId: id,
        description: `Failed to delete notification ${id}: ${error.message}`,
        metadata: {
          notificationId: id,
          title: existingNotification.title,
          status: existingNotification.status,
          targetAudience: existingNotification.target_audience,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw error;
    }

    // 🕵️ AUDIT LOG: Track successful notification deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_notification",
      resourceType: "Notification",
      resourceId: id,
      description: `Deleted notification: "${existingNotification.title}"`,
      metadata: {
        notificationId: id,
        title: existingNotification.title,
        status: existingNotification.status,
        targetAudience: existingNotification.target_audience,
        type: existingNotification.type,
        createdBy: existingNotification.created_by,
        createdAt: existingNotification.created_at,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      success: true,
      message: 'Notification deleted successfully',
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Delete notification error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "notification_delete_error",
      resourceType: "Notification",
      description: `Unexpected error during notification deletion: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update notification (if you need this functionality)
export async function PATCH(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Get current notification state for audit log
    const { data: currentNotification, error: fetchError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Prevent updates to sent notifications
    if (currentNotification.status === 'sent') {
      return NextResponse.json(
        { error: "Cannot modify already sent notifications" },
        { status: 400 }
      );
    }

    const { data: updatedNotification, error } = await supabase
      .from('admin_notifications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 🕵️ AUDIT LOG: Track notification update
    const changedFields = Object.keys(updates);
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_notification",
      resourceType: "Notification",
      resourceId: id,
      description: `Updated notification: "${currentNotification.title}" - ${changedFields.join(', ')}`,
      metadata: {
        notificationId: id,
        title: currentNotification.title,
        changedFields,
        previousValues: currentNotification,
        newValues: updatedNotification,
        updatedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      notification: updatedNotification,
      message: 'Notification updated successfully',
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
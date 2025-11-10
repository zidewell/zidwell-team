import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabaseAdmin = createClient(
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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, fist_name, last_name, wallet_balance, phone, role, created_at")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ user: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id } = await params;
    const body = await req.json();

    console.log("🛠️ PATCH Request User ID:", id);
    console.log("🛠️ PATCH Request Body:", body);

    // Get current user state for audit log
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, phone, role, wallet_balance, created_at")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent user
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_detail_update_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to update user ${id}: User not found`,
        metadata: {
          userId: id,
          attemptedUpdates: body,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Allow only safe fields to update
    const allowedFields = ["first_name", "last_name", "phone", "role"];
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(updateData).length === 0) {
      // 🕵️ AUDIT LOG: Track invalid update attempt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_detail_update_invalid",
        resourceType: "User",
        resourceId: id,
        description: `Attempted to update user ${id} with invalid fields`,
        metadata: {
          userId: id,
          userEmail: currentUser.email,
          attemptedFields: Object.keys(body),
          allowedFields,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating user:", error);
      
      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_detail_update_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to update user ${id}: ${error.message}`,
        metadata: {
          userId: id,
          userEmail: currentUser.email,
          attemptedUpdates: updateData,
          previousValues: currentUser,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedUser = data;

    // 🕵️ AUDIT LOG: Track successful user update
    const changedFields = Object.keys(updateData);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_user_detail",
      resourceType: "User",
      resourceId: id,
      description: `Updated user ${currentUser.email}: ${changedFields.join(', ')}`,
      metadata: {
        userId: id,
        userEmail: currentUser.email,
        changedFields,
        previousValues: currentUser,
        newValues: updatedUser,
        updatedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for role changes
    if (updateData.role && updateData.role !== currentUser.role) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "change_user_role",
        resourceType: "User",
        resourceId: id,
        description: `Changed user ${currentUser.email} role from ${currentUser.role} to ${updateData.role}`,
        metadata: {
          userId: id,
          userEmail: currentUser.email,
          previousRole: currentUser.role,
          newRole: updateData.role,
          changedBy: adminUser?.email,
          timestamp: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for profile information changes
    if (updateData.first_name || updateData.last_name || updateData.phone) {
      const profileChanges = [];
      if (updateData.first_name && updateData.first_name !== currentUser.first_name) {
        profileChanges.push(`first name: ${currentUser.first_name} → ${updateData.first_name}`);
      }
      if (updateData.last_name && updateData.last_name !== currentUser.last_name) {
        profileChanges.push(`last name: ${currentUser.last_name} → ${updateData.last_name}`);
      }
      if (updateData.phone && updateData.phone !== currentUser.phone) {
        profileChanges.push(`phone: ${currentUser.phone} → ${updateData.phone}`);
      }

      if (profileChanges.length > 0) {
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "update_user_profile",
          resourceType: "User",
          resourceId: id,
          description: `Updated profile information for user ${currentUser.email}`,
          metadata: {
            userId: id,
            userEmail: currentUser.email,
            profileChanges,
            updatedBy: adminUser?.email
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      }
    }

    return NextResponse.json({ 
      user: updatedUser, 
      message: "✅ User updated successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error("User detail update error:", error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "user_detail_update_error",
      resourceType: "User",
      description: `Unexpected error during user detail update: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id } = await params;

    // Get user before deletion for audit log
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, phone, role, wallet_balance, created_at")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent user
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_detail_delete_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to delete user ${id}: User not found`,
        metadata: {
          userId: id,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deletion
    if (adminUser && user.id === adminUser.id) {
      // 🕵️ AUDIT LOG: Track self-deletion attempt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_self_deletion_attempt",
        resourceType: "User",
        resourceId: id,
        description: `Attempted to delete own admin account: ${user.email}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          adminEmail: adminUser.email,
          reason: "Self-deletion not allowed",
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

    if (error) {
      console.error("❌ Error deleting user:", error);
      
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_detail_delete_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to delete user ${id}: ${error.message}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          userRole: user.role,
          walletBalance: user.wallet_balance,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful user deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_user_detail",
      resourceType: "User",
      resourceId: id,
      description: `Deleted user account: ${user.email}`,
      metadata: {
        userId: id,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        userRole: user.role,
        phone: user.phone,
        walletBalance: user.wallet_balance,
        accountCreated: user.created_at,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      ok: true, 
      message: "✅ User deleted successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error("User detail deletion error:", error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "user_detail_delete_error",
      resourceType: "User",
      description: `Unexpected error during user detail deletion: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Improved helper function to extract admin user info from cookies
async function getAdminUserInfo(cookieHeader: string) {
  try {
    if (!cookieHeader) {
      console.error("No cookie header provided");
      return null;
    }

    const cookies = cookieHeader
      .split(";")
      .reduce((acc: { [key: string]: string }, cookie) => {
        const [name, value] = cookie.trim().split("=");
        if (name && value) {
          acc[name] = decodeURIComponent(value);
        }
        return acc;
      }, {});

    const accessToken = cookies["sb-access-token"];

    if (!accessToken) {
      console.error("No access token found in cookies");
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Error getting admin user:", error);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Error extracting admin user info:", error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ["super_admin", "operations_admin", "support_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    const id = (await params).id;

    console.log("🔍 Fetching user details for ID:", id);

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, first_name, last_name, wallet_balance, phone, admin_role, created_at, is_blocked, blocked_at, block_reason, last_login, last_logout"
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Error fetching user:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.log("✅ User fetched successfully:", data.email);
    return NextResponse.json({ user: data });
  } catch (error: any) {
    console.error("User detail fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    const clientInfo = getClientInfo(req.headers);
    
    // Check if admin is authenticated
    if (!adminUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const id = (await params).id;

    const body = await req.json();

    console.log("🛠️ PATCH Request User ID:", id);
    console.log("🛠️ PATCH Request Body:", body);
    console.log("🛠️ Admin performing update:", adminUser.email);

    // Get current user state for audit log - FIXED: removed role field
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, first_name, last_name, phone, admin_role, wallet_balance, created_at, is_blocked, blocked_at, block_reason"
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent user
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_detail_update_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to update user ${id}: User not found`,
        metadata: {
          userId: id,
          attemptedUpdates: body,
          error: fetchError.message,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Allow only safe fields to update
    const allowedFields = ["first_name", "last_name", "phone"];
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(updateData).length === 0) {
      // 🕵️ AUDIT LOG: Track invalid update attempt
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_detail_update_invalid",
        resourceType: "User",
        resourceId: id,
        description: `Attempted to update user ${id} with invalid fields`,
        metadata: {
          userId: id,
          userEmail: currentUser.email,
          attemptedFields: Object.keys(body),
          allowedFields,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    console.log("📝 Update data after filtering:", updateData);

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
        userId: adminUser.id,
        userEmail: adminUser.email,
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
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedUser = data;

    // 🕵️ AUDIT LOG: Track successful user update
    const changedFields = Object.keys(updateData);

    await createAuditLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "update_user_detail",
      resourceType: "User",
      resourceId: id,
      description: `Updated user ${currentUser.email}: ${changedFields.join(
        ", "
      )}`,
      metadata: {
        userId: id,
        userEmail: currentUser.email,
        changedFields,
        previousValues: currentUser,
        newValues: updatedUser,
        updatedBy: adminUser.email,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Special audit for admin_role changes - FIXED: using admin_role instead of role
    if (updateData.admin_role && updateData.admin_role !== currentUser.admin_role) {
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "change_user_admin_role",
        resourceType: "User",
        resourceId: id,
        description: `Changed user ${currentUser.email} admin role from ${currentUser.admin_role} to ${updateData.admin_role}`,
        metadata: {
          userId: id,
          userEmail: currentUser.email,
          previousAdminRole: currentUser.admin_role,
          newAdminRole: updateData.admin_role,
          changedBy: adminUser.email,
          timestamp: new Date().toISOString(),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    // Special audit for profile information changes
    if (updateData.first_name || updateData.last_name || updateData.phone) {
      const profileChanges = [];
      if (
        updateData.first_name &&
        updateData.first_name !== currentUser.first_name
      ) {
        profileChanges.push(
          `first name: ${currentUser.first_name} → ${updateData.first_name}`
        );
      }
      if (
        updateData.last_name &&
        updateData.last_name !== currentUser.last_name
      ) {
        profileChanges.push(
          `last name: ${currentUser.last_name} → ${updateData.last_name}`
        );
      }
      if (updateData.phone && updateData.phone !== currentUser.phone) {
        profileChanges.push(
          `phone: ${currentUser.phone} → ${updateData.phone}`
        );
      }

      if (profileChanges.length > 0) {
        await createAuditLog({
          userId: adminUser.id,
          userEmail: adminUser.email,
          action: "update_user_profile",
          resourceType: "User",
          resourceId: id,
          description: `Updated profile information for user ${currentUser.email}`,
          metadata: {
            userId: id,
            userEmail: currentUser.email,
            profileChanges,
            updatedBy: adminUser.email,
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
        });
      }
    }

    console.log("✅ User updated successfully:", updatedUser.email);

    return NextResponse.json({
      user: updatedUser,
      message: "✅ User updated successfully",
      _admin: {
        performedBy: adminUser.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
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
        stack: error.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    const clientInfo = getClientInfo(req.headers);

    // Check if admin is authenticated
    if (!adminUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const id = (await params).id;

    console.log("🗑️ DELETE Request User ID:", id);
    console.log("🗑️ Admin performing deletion:", adminUser.email);

    // Get user before deletion for audit log - FIXED: removed role field
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, first_name, last_name, phone, admin_role, wallet_balance, created_at, is_blocked, blocked_at, block_reason"
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent user
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_detail_delete_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to delete user ${id}: User not found`,
        metadata: {
          userId: id,
          error: fetchError.message,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deletion
    if (user.id === adminUser.id) {
      // 🕵️ AUDIT LOG: Track self-deletion attempt
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_self_deletion_attempt",
        resourceType: "User",
        resourceId: id,
        description: `Attempted to delete own admin account: ${user.email}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          adminEmail: adminUser.email,
          reason: "Self-deletion not allowed",
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    console.log("🗑️ Deleting user:", user.email);

    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

    if (error) {
      console.error("❌ Error deleting user:", error);

      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_detail_delete_failed",
        resourceType: "User",
        resourceId: id,
        description: `Failed to delete user ${id}: ${error.message}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          userAdminRole: user.admin_role, // FIXED: changed from userRole
          walletBalance: user.wallet_balance,
          error: error.message,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful user deletion
    await createAuditLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "delete_user_detail",
      resourceType: "User",
      resourceId: id,
      description: `Deleted user account: ${user.email}`,
      metadata: {
        userId: id,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        userAdminRole: user.admin_role, // FIXED: changed from userRole
        phone: user.phone,
        walletBalance: user.wallet_balance,
        accountCreated: user.created_at,
        deletedBy: adminUser.email,
        deletionTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    console.log("✅ User deleted successfully:", user.email);

    return NextResponse.json({
      ok: true,
      message: "✅ User deleted successfully",
      _admin: {
        performedBy: adminUser.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
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
        stack: error.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    const clientInfo = getClientInfo(req.headers);

    // Check if admin is authenticated
    if (!adminUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const id = (await params).id;
    const body = await req.json();
    const { action, reason } = body;

    console.log(`🛑 ${action?.toUpperCase()} Request for User ID:`, id);
    console.log("📝 Reason:", reason);
    console.log("🛠️ Admin performing action:", adminUser.email);

    if (!action || !["block", "unblock"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'block' or 'unblock'" },
        { status: 400 }
      );
    }

    // Get user details for audit log - FIXED: removed role field
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, first_name, last_name, phone, admin_role, created_at, is_blocked, blocked_at, block_reason"
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: `user_${action}_failed`,
        resourceType: "User",
        resourceId: id,
        description: `Failed to ${action} user ${id}: User not found`,
        metadata: {
          userId: id,
          action,
          reason,
          error: fetchError.message,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-blocking
    if (user.id === adminUser.id) {
      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "user_self_block_attempt",
        resourceType: "User",
        resourceId: id,
        description: `Attempted to ${action} own admin account: ${user.email}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          adminEmail: adminUser.email,
          action,
          reason: "Self-blocking not allowed",
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json(
        { error: `Cannot ${action} your own account` },
        { status: 400 }
      );
    }

    // BLOCK/UNBLOCK USER IN SUPABASE AUTH
    let authResult;
    if (action === "block") {
      // Block user in Supabase Auth
      authResult = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: "87600h", // ~10 years (effectively permanent)
      });
    } else {
      // Unblock user in Supabase Auth
      authResult = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: undefined, // Remove ban
      });
    }

    if (authResult.error) {
      console.error(`❌ Error ${action}ing user in auth:`, authResult.error);

      await createAuditLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: `user_${action}_failed`,
        resourceType: "User",
        resourceId: id,
        description: `Failed to ${action} user ${user.email} in auth: ${authResult.error.message}`,
        metadata: {
          userId: id,
          userEmail: user.email,
          action,
          reason,
          error: authResult.error.message,
          attemptedBy: adminUser.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json(
        { error: authResult.error.message },
        { status: 500 }
      );
    }

    // Update our database to track the block status - USING THE CORRECT COLUMNS
    const updateData = {
      is_blocked: action === "block",
      blocked_at: action === "block" ? new Date().toISOString() : null,
      block_reason: action === "block" ? reason : null,
      updated_at: new Date().toISOString(),
    };

    console.log("📝 Update data for database:", updateData);

    const { error: dbError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id);

    if (dbError) {
      console.error(
        "❌ Error updating user block status in database:",
        dbError
      );
      // Don't return error here since auth block was successful
    }

    // 🕵️ AUDIT LOG: Track successful block/unblock
    await createAuditLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: action === "block" ? "block_user" : "unblock_user",
      resourceType: "User",
      resourceId: id,
      description: `${action === "block" ? "Blocked" : "Unblocked"} user: ${
        user.email
      }${reason ? ` - Reason: ${reason}` : ""}`,
      metadata: {
        userId: id,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        action,
        reason,
        blockedAt: action === "block" ? new Date().toISOString() : null,
        performedBy: adminUser.email,
        authUserId: authResult.data?.user?.id || id,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    console.log(`✅ User ${action}ed successfully:`, user.email);

    return NextResponse.json({
      ok: true,
      message: `✅ User ${action}ed successfully`,
      user: {
        id: user.id,
        email: user.email,
        is_blocked: action === "block",
        blocked_at: updateData.blocked_at,
        block_reason: updateData.block_reason,
      },
      _admin: {
        performedBy: adminUser.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("User block/unblock error:", error);

    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "user_block_error",
      resourceType: "User",
      description: `Unexpected error during user block/unblock: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
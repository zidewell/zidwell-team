import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ROLE_PERMISSIONS } from "@/lib/admin-auth";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let adminUser: any = null;
  
  try {
    adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;
      
    const allowedRoles = ['super_admin', 'operations_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { first_name, last_name, email, role, status } = body;
    const clientInfo = getClientInfo(request.headers);

    // Check if admin exists
    const { data: existingAdmin, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .in("admin_role", [
        "super_admin",
        "finance_admin",
        "operations_admin",
        "support_admin",
        "legal_admin",
      ])
      .eq("id", id)
      .single();

    if (fetchError || !existingAdmin) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_update_failed",
        resourceType: "Admin",
        resourceId: id,
        description: `Failed to update admin ${id}: Admin not found`,
        metadata: {
          targetAdminId: id,
          attemptedChanges: body,
          error: fetchError?.message || "Admin not found"
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Prevent self role modification
    if (id === adminUser?.id && role && role !== existingAdmin.admin_role) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_self_modification_attempt",
        resourceType: "Admin",
        resourceId: id,
        description: `Attempted to modify own admin role from ${existingAdmin.admin_role} to ${role}`,
        metadata: {
          targetAdminId: id,
          currentRole: existingAdmin.admin_role,
          attemptedRole: role,
          reason: "Self-role modification not allowed"
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: "Cannot modify your own admin role" },
        { status: 400 }
      );
    }

    // Validate new role
    if (role && !ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_update_failed",
        resourceType: "Admin",
        resourceId: id,
        description: `Failed to update admin ${id}: Invalid role ${role}`,
        metadata: {
          targetAdminId: id,
          targetAdminEmail: existingAdmin.email,
          attemptedRole: role,
          validRoles: Object.keys(ROLE_PERMISSIONS)
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Invalid admin role" }, { status: 400 });
    }

    const updateData: any = {};
    const changes: string[] = [];

    if (first_name && first_name !== existingAdmin.first_name) {
      updateData.first_name = first_name;
      changes.push(`first name: ${existingAdmin.first_name} → ${first_name}`);
    }
    if (last_name && last_name !== existingAdmin.last_name) {
      updateData.last_name = last_name;
      changes.push(`last name: ${existingAdmin.last_name} → ${last_name}`);
    }
    if (email && email !== existingAdmin.email) {
      updateData.email = email;
      changes.push(`email: ${existingAdmin.email} → ${email}`);
    }
    if (role && role !== existingAdmin.admin_role) {
      updateData.admin_role = role;
      changes.push(`role: ${existingAdmin.admin_role} → ${role}`);
    }
    if (status !== undefined) {
      const newBlockedStatus = status === "inactive";
      const currentBlockedStatus = existingAdmin.is_blocked;
      
      if (newBlockedStatus !== currentBlockedStatus) {
        updateData.is_blocked = newBlockedStatus;
        if (newBlockedStatus) {
          updateData.blocked_at = new Date().toISOString();
          updateData.block_reason = "Admin deactivated";
          changes.push(`status: active → inactive`);
        } else {
          updateData.blocked_at = null;
          updateData.block_reason = null;
          changes.push(`status: inactive → active`);
        }
      }
    }

    // If no changes, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        message: "No changes detected", 
        admin: existingAdmin 
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedAdmin, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin:", error);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_update_failed",
        resourceType: "Admin",
        resourceId: id,
        description: `Failed to update admin ${existingAdmin.email}: ${error.message}`,
        metadata: {
          targetAdminId: id,
          targetAdminEmail: existingAdmin.email,
          attemptedChanges: updateData,
          error: error.message,
          changesAttempted: changes
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
    }

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_admin",
      resourceType: "Admin",
      resourceId: id,
      description: `Updated admin ${existingAdmin.email}: ${changes.join(', ')}`,
      metadata: {
        targetAdminId: id,
        targetAdminEmail: existingAdmin.email,
        changes: changes,
        previousData: {
          first_name: existingAdmin.first_name,
          last_name: existingAdmin.last_name,
          email: existingAdmin.email,
          role: existingAdmin.admin_role,
          status: existingAdmin.is_blocked ? 'inactive' : 'active'
        },
        newData: {
          first_name: updatedAdmin.first_name,
          last_name: updatedAdmin.last_name,
          email: updatedAdmin.email,
          role: updatedAdmin.admin_role,
          status: updatedAdmin.is_blocked ? 'inactive' : 'active'
        },
        updatedBy: adminUser?.email,
        updateTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for role changes
    if (role && role !== existingAdmin.admin_role) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "change_admin_role",
        resourceType: "Admin",
        resourceId: id,
        description: `Changed admin role for ${existingAdmin.email} from ${existingAdmin.admin_role} to ${role}`,
        metadata: {
          targetAdminId: id,
          targetAdminEmail: existingAdmin.email,
          previousRole: existingAdmin.admin_role,
          newRole: role,
          changedBy: adminUser?.email,
          changeTime: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for status changes
    if (status !== undefined) {
      const newStatus = status === "inactive" ? "inactive" : "active";
      const previousStatus = existingAdmin.is_blocked ? "inactive" : "active";
      
      if (newStatus !== previousStatus) {
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: newStatus === "active" ? "activate_admin" : "deactivate_admin",
          resourceType: "Admin",
          resourceId: id,
          description: `${newStatus === "active" ? "Activated" : "Deactivated"} admin ${existingAdmin.email}`,
          metadata: {
            targetAdminId: id,
            targetAdminEmail: existingAdmin.email,
            previousStatus,
            newStatus,
            actionBy: adminUser?.email,
            actionTime: new Date().toISOString()
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      }
    }

    const roleInfo = ROLE_PERMISSIONS[updatedAdmin.admin_role as keyof typeof ROLE_PERMISSIONS];

    return NextResponse.json({
      message: "Admin updated successfully",
      admin: {
        ...updatedAdmin,
        full_name: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
        role_display: roleInfo.name,
        role_description: roleInfo.description,
        is_current_user: updatedAdmin.id === adminUser?.id,
      },
      auditLogged: true,
      changes: changes
    });
  } catch (error: any) {
    console.error("Error updating admin:", error);
    
    const clientInfo = getClientInfo(request.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "admin_update_error",
      resourceType: "Admin",
      description: `Unexpected error during admin update: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let adminUser: any = null;
  
  try {
    adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const clientInfo = getClientInfo(request.headers);

    // Prevent removing your own admin privileges
    if (id === adminUser?.id) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_self_removal_attempt",
        resourceType: "Admin",
        resourceId: id,
        description: `Attempted to remove own admin privileges`,
        metadata: {
          targetAdminId: id,
          targetAdminEmail: adminUser?.email,
          reason: "Self-removal not allowed"
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: "You cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    // Check if target user is an admin
    const { data: existingAdmin, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .in("admin_role", [
        "super_admin",
        "finance_admin",
        "operations_admin",
        "support_admin",
        "legal_admin",
      ])
      .eq("id", id)
      .single();

    if (fetchError || !existingAdmin) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_removal_failed",
        resourceType: "Admin",
        resourceId: id,
        description: `Failed to remove admin privileges from ${id}: Admin not found`,
        metadata: {
          targetAdminId: id,
          error: fetchError?.message || "Admin not found"
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Downgrade the user: remove admin privileges
    const { data: downgradedUser, error: updateError } = await supabase
      .from("users")
      .update({
        admin_role: null,
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error removing admin privileges:", updateError);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_removal_failed",
        resourceType: "Admin",
        resourceId: id,
        description: `Failed to remove admin privileges from ${existingAdmin.email}: ${updateError.message}`,
        metadata: {
          targetAdminId: id,
          targetAdminEmail: existingAdmin.email,
          targetAdminRole: existingAdmin.admin_role,
          error: updateError.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Failed to remove admin privileges" }, { status: 500 });
    }

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "remove_admin_privileges",
      resourceType: "Admin",
      resourceId: id,
      description: `Removed admin privileges from ${existingAdmin.email} (${existingAdmin.admin_role})`,
      metadata: {
        targetAdminId: id,
        targetAdminEmail: existingAdmin.email,
        previousRole: existingAdmin.admin_role,
        removedBy: adminUser?.email,
        removalTime: new Date().toISOString(),
        previousStatus: existingAdmin.is_blocked ? 'inactive' : 'active'
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({
      message: `Admin privileges removed for ${existingAdmin.email}`,
      success: true,
      downgradedUser,
      auditLogged: true
    });
  } catch (error: any) {
    console.error("Error removing admin privileges:", error);
    
    const clientInfo = getClientInfo(request.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "admin_removal_error",
      resourceType: "Admin",
      description: `Unexpected error during admin removal: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
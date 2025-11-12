import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ROLE_PERMISSIONS } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request, "edit_admin_roles");
    if (adminUser instanceof NextResponse) return adminUser;
      
      const allowedRoles = ['super_admin', 'operations_admin'];
      if (!allowedRoles.includes(adminUser?.admin_role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

    const id = (await params).id;
    const body = await request.json();
    const { first_name, last_name, email, role, status } = body;

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

   

    if (!existingAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Prevent self role modification
    if (id === adminUser?.id && role && role !== existingAdmin.admin_role) {
      return NextResponse.json(
        { error: "Cannot modify your own admin role" },
        { status: 400 }
      );
    }

    // Validate new role
    if (role && !ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      return NextResponse.json({ error: "Invalid admin role" }, { status: 400 });
    }

    const updateData: any = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;
    if (role) updateData.admin_role = role;
    if (status !== undefined) {
      updateData.is_blocked = status === "inactive";
      if (status === "inactive") {
        updateData.blocked_at = new Date().toISOString();
        updateData.block_reason = "Admin deactivated";
      } else {
        updateData.blocked_at = null;
        updateData.block_reason = null;
      }
    }

    const { data: updatedAdmin, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin:", error);
      return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
    }

    // Log the activity
    await supabase.from("user_activity_logs").insert({
      user_id: adminUser?.id,
      email: adminUser?.email!,
      action: "update_admin",
      description: `Updated admin ${updatedAdmin.email}${
        role ? `, changed role to ${role}` : ""
      }`,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    const roleInfo =
      ROLE_PERMISSIONS[updatedAdmin.admin_role as keyof typeof ROLE_PERMISSIONS];

    return NextResponse.json({
      message: "Admin updated successfully",
      admin: {
        ...updatedAdmin,
        full_name: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
        role_display: roleInfo.name,
        role_description: roleInfo.description,
        is_current_user: updatedAdmin.id === adminUser?.id,
      },
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request, "delete_admin_roles");
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const id = (await params).id;

    // Prevent removing your own admin privileges
    if (id === adminUser?.id) {
      return NextResponse.json(
        { error: "You cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    // ✅ Check if target user is an admin
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
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // ✅ Downgrade the user: remove admin privileges
    const { data: downgradedUser, error: updateError } = await supabase
      .from("users")
      .update({
        admin_role: null,
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error removing admin privileges:", updateError);
      return NextResponse.json({ error: "Failed to remove admin privileges" }, { status: 500 });
    }

    // ✅ Log the action
    await supabase.from("user_activity_logs").insert({
      user_id: adminUser?.id,
      email: adminUser?.email!,
      action: "remove_admin_privileges",
      description: `Removed admin privileges from ${existingAdmin.email}`,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      message: `Admin privileges removed for ${existingAdmin.email}`,
      success: true,
      downgradedUser,
    });
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


// app/api/admin-apis/admins/[id]/route.ts
import { requireAdmin, ROLE_PERMISSIONS } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only super admins can edit admin roles
    const adminUser = await requireAdmin(request, 'edit_admin_roles');
    if (adminUser instanceof NextResponse) {
      return adminUser;
    }

    const { id } = params;
    const body = await request.json();
    const { first_name, last_name, email, role, status } = body;

    // Check if admin exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Prevent self-modification of role
    if (id === adminUser?.id && role && role !== existingAdmin.admin_role) {
      return NextResponse.json(
        { error: 'Cannot modify your own admin role' },
        { status: 400 }
      );
    }

    // Validate role if changing
    if (role && !ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      return NextResponse.json(
        { error: 'Invalid admin role' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;
    if (role) updateData.admin_role = role;
    if (status !== undefined) {
      updateData.is_blocked = status === 'inactive';
      if (status === 'inactive') {
        updateData.blocked_at = new Date().toISOString();
        updateData.block_reason = 'Admin deactivated';
      } else {
        updateData.blocked_at = null;
        updateData.block_reason = null;
      }
    }

    const { data: updatedAdmin, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating admin:', error);
      return NextResponse.json(
        { error: 'Failed to update admin' },
        { status: 500 }
      );
    }

    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: adminUser?.id,
        email: adminUser?.email!,
        action: 'update_admin',
        description: `Updated admin profile${role ? `, changed role to ${role}` : ''}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    const roleInfo = ROLE_PERMISSIONS[updatedAdmin.admin_role as keyof typeof ROLE_PERMISSIONS];
    
    return NextResponse.json({
      message: 'Admin updated successfully',
      admin: {
        ...updatedAdmin,
        full_name: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
        role_display: roleInfo.name,
        role_description: roleInfo.description,
        is_current_user: updatedAdmin.id === adminUser?.id
      }
    });

  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
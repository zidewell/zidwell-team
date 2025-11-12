// app/api/admin-apis/admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, ROLE_PERMISSIONS } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = [
  'super_admin',
  'finance_admin',
  'operations_admin',
  'support_admin',
  'legal_admin',
];

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    // Only super_admin can fetch the admin list
    if (adminUser?.admin_role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.max(parseInt(searchParams.get('limit') || '10'), 1);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('admin_role', ADMIN_ROLES);

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('admin_role', roleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('is_blocked', statusFilter === 'inactive');
    }

    const { data: admins, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching admins:', error);
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }

    const roleCounts = ADMIN_ROLES.reduce((acc, role) => {
      acc[role] = admins?.filter(admin => admin.admin_role === role).length || 0;
      return acc;
    }, {} as Record<string, number>);

    const processedAdmins = (admins || []).map(admin => {
      const roleInfo = ROLE_PERMISSIONS[admin.admin_role as keyof typeof ROLE_PERMISSIONS];
      return {
        ...admin,
        full_name: `${admin.first_name} ${admin.last_name}`,
        role_display: roleInfo?.name || admin.admin_role,
        role_description: roleInfo?.description || '',
        is_current_user: admin.id === adminUser?.id,
      };
    });

    return NextResponse.json({
      admins: processedAdmins,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        total: count || 0,
        active: processedAdmins.filter(admin => !admin.is_blocked).length,
        ...roleCounts,
      },
    });
  } catch (error) {
    console.error('Error in admin list API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request, 'create_admin_roles');
    if (adminUser instanceof NextResponse) return adminUser;

    if (adminUser?.admin_role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { first_name, last_name, email, role, status = 'active' } = body;

    if (!first_name || !last_name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, role' },
        { status: 400 }
      );
    }

    if (!ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      return NextResponse.json({ error: 'Invalid admin role' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Update existing user to admin
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          admin_role: role,
          is_blocked: status === 'inactive',
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error upgrading user to admin:', updateError);
        return NextResponse.json({ error: 'Failed to upgrade user to admin' }, { status: 500 });
      }

      await supabase.from('user_activity_logs').insert({
        user_id: adminUser.id,
        email: adminUser.email!,
        action: 'create_admin_roles',
        description: `Upgraded user to ${role} admin`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      const roleInfo = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];

      return NextResponse.json({
        message: 'User upgraded to admin successfully',
        admin: {
          ...updatedUser,
          full_name: `${updatedUser.first_name} ${updatedUser.last_name}`,
          role_display: roleInfo.name,
          role_description: roleInfo.description,
          is_current_user: false,
        },
      });
    }

    // Create new admin user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name, last_name, admin_role: role },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }

    const { data: newAdmin, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        phone: '',
        wallet_balance: 0,
        admin_role: role,
        is_blocked: status === 'inactive',
        zidcoin_balance: 0,
        pin_set: false,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
    }

    await supabase.from('user_activity_logs').insert({
      user_id: adminUser.id,
      email: adminUser.email!,
      action: 'create_admin_roles',
      description: `Created new ${role} admin`,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    const roleInfo = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];

    return NextResponse.json({
      message: 'Admin created successfully',
      admin: {
        ...newAdmin,
        full_name: `${newAdmin.first_name} ${newAdmin.last_name}`,
        role_display: roleInfo.name,
        role_description: roleInfo.description,
        is_current_user: false,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

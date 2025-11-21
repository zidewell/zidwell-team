import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, ROLE_PERMISSIONS } from '@/lib/admin-auth';
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

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
  let adminUser: any = null;
  
  try {
    adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);

    // Only super_admin can fetch the admin list
    if (adminUser?.admin_role !== 'super_admin') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "unauthorized_admin_list_access",
        resourceType: "Admin",
        description: `User ${adminUser?.email} attempted to access admin list without super_admin privileges`,
        metadata: {
          userRole: adminUser?.admin_role,
          requiredRole: 'super_admin',
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

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
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_list_fetch_failed",
        resourceType: "Admin",
        description: `Failed to fetch admin list: ${error.message}`,
        metadata: {
          error: error.message,
          searchParams: { page, limit, search, roleFilter, statusFilter },
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

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

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "view_admin_list",
      resourceType: "Admin",
      description: `Viewed admin list with ${processedAdmins.length} admins`,
      metadata: {
        totalAdmins: count || 0,
        page,
        limit,
        searchTerm: search,
        roleFilter,
        statusFilter,
        resultsCount: processedAdmins.length,
        roleCounts,
        ipAddress: clientInfo.ipAddress
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
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
  } catch (error: any) {
    console.error('Error in admin list API:', error);
    
    const clientInfo = getClientInfo(request.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "admin_list_error",
      resourceType: "Admin",
      description: `Unexpected error in admin list API: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
        ipAddress: clientInfo.ipAddress
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let adminUser: any = null;
  
  try {
    adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);

    if (adminUser?.admin_role !== 'super_admin') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "unauthorized_admin_creation",
        resourceType: "Admin",
        description: `User ${adminUser?.email} attempted to create admin without super_admin privileges`,
        metadata: {
          userRole: adminUser?.admin_role,
          requiredRole: 'super_admin',
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { first_name, last_name, email, role, status = 'active' } = body;

    if (!first_name || !last_name || !email || !role) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_creation_validation_failed",
        resourceType: "Admin",
        description: `Admin creation validation failed for ${email}`,
        metadata: {
          providedData: body,
          missingFields: [
            !first_name && 'first_name',
            !last_name && 'last_name',
            !email && 'email',
            !role && 'role'
          ].filter(Boolean),
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, role' },
        { status: 400 }
      );
    }

    if (!ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_creation_invalid_role",
        resourceType: "Admin",
        description: `Attempted to create admin with invalid role: ${role}`,
        metadata: {
          email,
          attemptedRole: role,
          validRoles: Object.keys(ROLE_PERMISSIONS),
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

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
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error upgrading user to admin:', updateError);
        
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "admin_upgrade_failed",
          resourceType: "Admin",
          resourceId: existingUser.id,
          description: `Failed to upgrade user ${email} to admin role ${role}`,
          metadata: {
            targetUserId: existingUser.id,
            targetUserEmail: email,
            targetRole: role,
            targetStatus: status,
            error: updateError.message,
            ipAddress: clientInfo.ipAddress
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });

        return NextResponse.json({ error: 'Failed to upgrade user to admin' }, { status: 500 });
      }

      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "upgrade_user_to_admin",
        resourceType: "Admin",
        resourceId: existingUser.id,
        description: `Upgraded user ${email} to ${role} admin`,
        metadata: {
          targetUserId: existingUser.id,
          targetUserEmail: email,
          previousRole: existingUser.admin_role,
          newRole: role,
          previousStatus: existingUser.is_blocked ? 'inactive' : 'active',
          newStatus: status,
          upgradedBy: adminUser?.email,
          upgradeTime: new Date().toISOString(),
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
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
        action: 'upgraded'
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
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_auth_creation_failed",
        resourceType: "Admin",
        description: `Failed to create auth user for admin ${email}`,
        metadata: {
          email,
          role,
          status,
          error: authError.message,
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "admin_profile_creation_failed",
        resourceType: "Admin",
        description: `Failed to create admin profile for ${email}`,
        metadata: {
          authUserId: authUser.user.id,
          email,
          role,
          status,
          error: profileError.message,
          ipAddress: clientInfo.ipAddress
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      // Clean up auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
    }

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_admin",
      resourceType: "Admin",
      resourceId: newAdmin.id,
      description: `Created new ${role} admin: ${email}`,
      metadata: {
        adminId: newAdmin.id,
        adminEmail: email,
        role,
        status,
        createdBy: adminUser?.email,
        creationTime: new Date().toISOString(),
        ipAddress: clientInfo.ipAddress
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
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
      action: 'created'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating admin:', error);
    
    const clientInfo = getClientInfo(request.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "admin_creation_error",
      resourceType: "Admin",
      description: `Unexpected error during admin creation: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
        ipAddress: clientInfo.ipAddress
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
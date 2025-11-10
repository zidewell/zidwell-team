import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const id = (await params).id;
  try {
   // Only super admins can edit admin roles
    const adminUser = await requireAdmin(request, 'edit_admin_roles');
    if (adminUser instanceof NextResponse) {
      return adminUser;
    }
    // Admins can only view their own login history unless they're checking themselves
    if (id !== adminUser?.id) {
      return NextResponse.json(
        { error: 'Can only view your own login activity' },
        { status: 403 }
      );
    }

    // Get login history from existing login_history table
    const { data: loginHistory, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', id)
      .order('login_time', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching login history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch login history' },
        { status: 500 }
      );
    }

    return NextResponse.json(loginHistory || []);

  } catch (error) {
    console.error('Error in login activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
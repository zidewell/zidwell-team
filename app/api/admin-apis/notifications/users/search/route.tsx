import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ['super_admin', 'operations_admin', 'support_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const limit = Number(url.searchParams.get("limit") || "100");

    let query = supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, created_at")
      .order("created_at", { ascending: false });

    // Search by name or email
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Apply limit
    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0,
      search: search || null
    });

  } catch (error: any) {
    console.error('Users search API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
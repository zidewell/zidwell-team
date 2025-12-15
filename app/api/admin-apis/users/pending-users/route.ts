import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";

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
    const q = url.searchParams.get("q");
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortOrder = (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("pending_users")
      .select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);

    if (q) {
      query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      users: data || [],
      total: count || 0,
      page,
      perPage: limit,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("❌ GET /api/admin-apis/pending-users error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch pending users" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from "@/lib/admin-auth";

// Create admin client for reading audit logs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ['super_admin', 'legal_admin', 'operations_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "";
    const resourceType = searchParams.get("resourceType") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%,action.ilike.%${search}%,resource_type.ilike.%${search}%`);
    }
    
    // Apply action filter - use exact match for better results
    if (action && action !== "all") {
      query = query.eq('action', action);
    }
    
    // Apply resource type filter - use exact match for better results
    if (resourceType && resourceType !== "all") {
      query = query.eq('resource_type', resourceType);
    }
    
    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    // Get total count with current filters
    const { data: logs, error, count } = await query.range(from, to);

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const total = count || 0;

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        search,
        action,
        resourceType,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error("Error in audit logs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
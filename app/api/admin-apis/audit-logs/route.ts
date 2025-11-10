import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Create admin client for reading audit logs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
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
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply filters
    if (search) {
      query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%`);
    }
    
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }
    
    if (resourceType) {
      query = query.ilike('resource_type', `%${resourceType}%`);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error, count } = await query;

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
    });
  } catch (error) {
    console.error("Error in audit logs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
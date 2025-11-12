import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const { id: userId } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Get user email first to search by email
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build query
    let query = supabaseAdmin
      .from("contracts")
      .select("id, contract_title, status, created_at, signed_at, initiator_email, signee_email", { count: 'exact' })
      .or(`initiator_email.eq.${user.email},signee_email.eq.${user.email}`);

    // Add search filter
    if (search) {
      query = query.or(`contract_title.ilike.%${search}%,status.ilike.%${search}%`);
    }

    // Add pagination and ordering
    const { data: contracts, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    // Simple formatted response
    const formattedContracts = (contracts || []).map(contract => ({
      id: contract.id,
      title: contract.contract_title,
      status: contract.status,
      created_at: contract.created_at,
      signed_at: contract.signed_at,
      role: contract.initiator_email === user.email ? 'initiator' : 'signee'
    }));

    return NextResponse.json({ 
      contracts: formattedContracts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
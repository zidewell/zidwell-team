import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ['super_admin', 'operations_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clientInfo = getClientInfo(req.headers);
    const userId = params.id;

    // Get pending user details
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from("pending_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !pendingUser) {
      return NextResponse.json(
        { error: "Pending user not found" },
        { status: 404 }
      );
    }

    // Create user in main users table
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email: pendingUser.email,
        first_name: pendingUser.first_name,
        last_name: pendingUser.last_name,
        phone: pendingUser.phone,
        password_hash: pendingUser.password_hash,
        status: "active",
        role: "user",
        kyc_status: pendingUser.kyc_status || "pending",
        created_at: new Date().toISOString(),
        approved_by: adminUser?.id,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    // Delete from pending_users
    const { error: deleteError } = await supabaseAdmin
      .from("pending_users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      console.error("Failed to delete pending user:", deleteError);
    }

    // 🕵️ AUDIT LOG
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "approve_pending_user",
      resourceType: "User",
      resourceId: newUser.id,
      description: `Approved pending user: ${pendingUser.email}`,
      metadata: {
        pendingUserId: userId,
        userEmail: pendingUser.email,
        userName: `${pendingUser.first_name} ${pendingUser.last_name}`,
        approvedBy: adminUser?.email,
        approvalTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      user: newUser,
      message: "User approved successfully",
    });
  } catch (err: any) {
    console.error("❌ POST /api/admin-apis/pending-users/[id]/approve error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to approve user" },
      { status: 500 }
    );
  }
}
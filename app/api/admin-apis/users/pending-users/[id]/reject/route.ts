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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ['super_admin', 'operations_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clientInfo = getClientInfo(req.headers);
    const { reason } = await req.json();
     const { id: userId } = await params;

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

    // Move to rejected_users table or update status
    const { error: rejectError } = await supabaseAdmin
      .from("pending_users")
      .update({
        status: "rejected",
        rejected_reason: reason,
        rejected_by: adminUser?.id,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (rejectError) {
      throw new Error(rejectError.message);
    }

    // 🕵️ AUDIT LOG
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "reject_pending_user",
      resourceType: "User",
      resourceId: userId,
      description: `Rejected pending user: ${pendingUser.email}`,
      metadata: {
        pendingUserId: userId,
        userEmail: pendingUser.email,
        userName: `${pendingUser.first_name} ${pendingUser.last_name}`,
        reason: reason,
        rejectedBy: adminUser?.email,
        rejectionTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      message: "User rejected successfully",
    });
  } catch (err: any) {
    console.error("❌ POST /api/admin-apis/pending-users/[id]/reject error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to reject user" },
      { status: 500 }
    );
  }
}
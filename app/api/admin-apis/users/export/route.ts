import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";
import { Parser } from "json2csv";

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

    const clientInfo = getClientInfo(req.headers);
    const url = new URL(req.url);
    
    // Get all filter parameters
    const type = url.searchParams.get("type") || "active";
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    const role = url.searchParams.get("role");
    const activity = url.searchParams.get("activity");
    const balance = url.searchParams.get("balance");
    const lowThreshold = Number(url.searchParams.get("low_threshold")) || 1000;
    const highThreshold = Number(url.searchParams.get("high_threshold")) || 100000;

    let query;
    let tableName = type === "pending" ? "pending_users" : "users";

    console.log('Export filters:', { type, search, status, role, activity, balance });

    // Build the query based on type
    if (type === "pending") {
      query = supabaseAdmin
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });
    } else {
      query = supabaseAdmin
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });
    }

    // Apply text search filter
    if (search) {
      if (type === "pending") {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      } else {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
    }

    // Apply status filter (active/blocked)
    if (status && status !== "all") {
      if (status === "blocked") {
        query = query.eq("is_blocked", true);
      } else if (status === "active") {
        query = query.eq("is_blocked", false).eq("status", "active");
      }
    }

    // Apply role filter
    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    // Apply activity filter (for active users only)
    if (type === "active" && activity && activity !== "all") {
      const now = new Date();
      
      if (activity === "active") {
        // Active in last 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte("last_login", thirtyDaysAgo.toISOString());
      } else if (activity === "today") {
        // Active today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte("last_login", today.toISOString());
      } else if (activity === "week") {
        // Active this week
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte("last_login", weekAgo.toISOString());
      } else if (activity === "inactive") {
        // Inactive for 30+ days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.lt("last_login", thirtyDaysAgo.toISOString()).or(`last_login.is.null`);
      }
    }

    // Apply balance filter (for active users only)
    if (type === "active" && balance && balance !== "all") {
      if (balance === "high") {
        query = query.gte("wallet_balance", highThreshold);
      } else if (balance === "low") {
        query = query.lte("wallet_balance", lowThreshold).gte("wallet_balance", 0);
      } else if (balance === "negative") {
        query = query.lt("wallet_balance", 0);
      } else if (balance === "zero") {
        query = query.eq("wallet_balance", 0);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Format data for CSV
    const formattedData = data.map((user: any) => {
      // Common fields for both types
      const baseData: any = {
        "User ID": user.id,
        "Email": user.email,
        "First Name": user.first_name || "",
        "Last Name": user.last_name || "",
        "Full Name": `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        "Phone": user.phone || "",
        "Registration Date": user.created_at ? new Date(user.created_at).toLocaleDateString() : "",
        "Registration DateTime": user.created_at ? new Date(user.created_at).toISOString() : "",
      };

      if (type === "pending") {
        // Pending user specific fields
        return {
          ...baseData,
          "KYC Status": user.kyc_status || "not_started",
          "Status": user.status || "pending",
          "Rejection Reason": user.rejected_reason || "",
          "Rejected By": user.rejected_by || "",
          "Rejected At": user.rejected_at ? new Date(user.rejected_at).toLocaleString() : "",
        };
      } else {
        // Active user specific fields
        const walletBalance = Number(user.wallet_balance) || 0;
        let balanceCategory = "Normal";
        
        if (walletBalance >= highThreshold) balanceCategory = "High";
        else if (walletBalance <= lowThreshold && walletBalance >= 0) balanceCategory = "Low";
        else if (walletBalance < 0) balanceCategory = "Negative";
        else if (walletBalance === 0) balanceCategory = "Zero";

        return {
          ...baseData,
          "Role": user.role || "user",
          "Status": user.is_blocked ? "Blocked" : (user.status || "Active"),
          "KYC Status": user.kyc_status || "not_started",
          "Wallet Balance": walletBalance,
          "Balance Category": balanceCategory,
          "Last Login": user.last_login ? new Date(user.last_login).toLocaleString() : "Never",
          "Last Logout": user.last_logout ? new Date(user.last_logout).toLocaleString() : "Never",
          "Blocked": user.is_blocked ? "Yes" : "No",
          "Blocked At": user.blocked_at ? new Date(user.blocked_at).toLocaleString() : "",
          "Blocked Reason": user.blocked_reason || "",
          "Updated At": user.updated_at ? new Date(user.updated_at).toLocaleString() : "",
          "Account Age (Days)": user.created_at ? 
            Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
      }
    });

    // Define CSV fields based on user type
    let fields: string[];
    if (type === "pending") {
      fields = [
        "User ID",
        "Email",
        "First Name", 
        "Last Name",
        "Full Name",
        "Phone",
        "Registration Date",
        "Registration DateTime",
        "KYC Status",
        "Status",
        "Rejection Reason",
        "Rejected By",
        "Rejected At"
      ];
    } else {
      fields = [
        "User ID",
        "Email",
        "First Name",
        "Last Name",
        "Full Name",
        "Phone",
        "Role",
        "Status",
        "KYC Status",
        "Wallet Balance",
        "Balance Category",
        "Last Login",
        "Last Logout",
        "Blocked",
        "Blocked At",
        "Blocked Reason",
        "Registration Date",
        "Registration DateTime",
        "Updated At",
        "Account Age (Days)"
      ];
    }

    // Convert to CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);

    // Create filename with filter details
    let filename = `${type}_users_${new Date().toISOString().split('T')[0]}`;
    
    // Add filter info to filename if any filters are applied
    const filterParts = [];
    if (search) filterParts.push(`search-${search.substring(0, 10)}`);
    if (status && status !== 'all') filterParts.push(status);
    if (activity && activity !== 'all') filterParts.push(activity);
    if (balance && balance !== 'all') filterParts.push(`${balance}-balance`);
    
    if (filterParts.length > 0) {
      filename += `_${filterParts.join('_')}`;
    }
    filename += '.csv';

    // 🕵️ AUDIT LOG
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "export_users_csv",
      resourceType: "User",
      description: `Exported ${data.length} ${type} users to CSV with filters`,
      metadata: {
        type,
        count: data.length,
        filters: { 
          search, 
          status, 
          role, 
          activity, 
          balance,
          low_threshold: lowThreshold,
          high_threshold: highThreshold
        },
        exportedBy: adminUser?.email,
        exportTime: new Date().toISOString(),
        filename,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Count": data.length.toString(),
        "X-Export-Type": type,
      },
    });
  } catch (err: any) {
    console.error("❌ GET /api/admin-apis/users/export error:", err.message);
    
    // 🕵️ AUDIT LOG for export failure
    try {
      const adminUser = await requireAdmin(req);
      if (!(adminUser instanceof NextResponse)) {
        const clientInfo = getClientInfo(req.headers);
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "export_users_csv_failed",
          resourceType: "User",
          description: `Failed to export users CSV: ${err.message}`,
          metadata: {
            error: err.message,
            attemptedBy: adminUser?.email,
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
        });
      }
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json(
      { error: "Failed to export users data", details: err.message },
      { status: 500 }
    );
  }
}
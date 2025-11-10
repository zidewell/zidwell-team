// app/api/admin-apis/receipts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ENHANCED ADMIN RECEIPTS CACHE
const adminReceiptsCache = new Map();
const ADMIN_RECEIPTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Statistics cache (separate for better performance)
const receiptsStatsCache = new Map();
const STATS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getRangeDates(range: string | null) {
  if (!range || range === "total") return null;

  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      return null;
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

interface AdminReceiptsQuery {
  page: number;
  limit: number;
  range: string;
  search: string;
  status: string;
  startDate: string;
  endDate: string;
  includeStats?: boolean;
}

// Cache management functions - NOT EXPORTED
function clearAdminReceiptsCache(filters?: Partial<AdminReceiptsQuery>) {
  if (filters) {
    const cacheKey = `admin_receipts_${filters.page || 1}_${filters.limit || 10}_${filters.range || 'total'}_${filters.search || ''}_${filters.status || ''}_${filters.startDate || ''}_${filters.endDate || ''}_${filters.includeStats || false}`;
    const existed = adminReceiptsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared specific admin receipts cache: ${cacheKey}`);
    }
    
    return existed;
  } else {
    const count = adminReceiptsCache.size;
    adminReceiptsCache.clear();
    console.log(`🧹 Cleared all admin receipts cache (${count} entries)`);
    return count;
  }
}

function clearReceiptsStatsCache(range?: string) {
  if (range) {
    const cacheKey = `receipts_stats_${range}`;
    const existed = receiptsStatsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared receipts stats cache for range: ${range}`);
    }
    
    return existed;
  } else {
    const count = receiptsStatsCache.size;
    receiptsStatsCache.clear();
    console.log(`🧹 Cleared all receipts stats cache (${count} entries)`);
    return count;
  }
}

function clearAllAdminReceiptsCache() {
  const receiptsCount = clearAdminReceiptsCache();
  const statsCount = clearReceiptsStatsCache();
  
  console.log(`🧹 Cleared all admin receipts cache (${receiptsCount} receipts, ${statsCount} stats)`);
  return { receiptsCount, statsCount };
}

async function getCachedReceiptsStats(range: string = "total") {
  const cacheKey = `receipts_stats_${range}`;
  const cached = receiptsStatsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_TTL) {
    console.log("✅ Using cached receipts statistics");
    return cached.data;
  }
  
  console.log("🔄 Fetching fresh receipts statistics");
  
  const rangeDates = getRangeDates(range);
  
  let statsQuery = supabaseAdmin
    .from("receipts")
    .select("status, total_amount, created_at");

  if (rangeDates) {
    statsQuery = statsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: receipts, error } = await statsQuery;

  if (error) {
    console.error("Error fetching receipts stats:", error);
    return null;
  }

  const stats = {
    total: receipts?.length || 0,
    draft: receipts?.filter(f => f.status === "draft").length || 0,
    sent: receipts?.filter(f => f.status === "sent").length || 0,
    paid: receipts?.filter(f => f.status === "paid").length || 0,
    overdue: receipts?.filter(f => f.status === "overdue").length || 0,
    cancelled: receipts?.filter(f => f.status === "cancelled").length || 0,
    totalRevenue: receipts?.filter(f => f.status === "paid").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
    pendingRevenue: receipts?.filter(f => f.status === "sent").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
    byMonth: receipts?.reduce((acc, f) => {
      const date = new Date(f.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  };

  receiptsStatsCache.set(cacheKey, {
    data: stats,
    timestamp: Date.now()
  });

  return stats;
}

async function getCachedAdminReceipts({
  page,
  limit,
  range,
  search,
  status,
  startDate,
  endDate,
  includeStats = false
}: AdminReceiptsQuery) {
  const cacheKey = `admin_receipts_${page}_${limit}_${range}_${search}_${status}_${startDate}_${endDate}_${includeStats}`;
  const cached = adminReceiptsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < ADMIN_RECEIPTS_CACHE_TTL) {
    console.log("✅ Using cached admin receipts data");
    return {
      ...cached.data,
      _fromCache: true
    };
  }
  
  console.log("🔄 Fetching fresh admin receipts data from database");
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build the query
  let query = supabaseAdmin
    .from("receipts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply search filter
  if (search) {
    query = query.or(`receipt_id.ilike.%${search}%,initiator_email.ilike.%${search}%,signee_email.ilike.%${search}%`);
  }

  // Apply status filter
  if (status) {
    query = query.eq("status", status);
  }

  // Apply date range filter (priority: custom dates > predefined range)
  if (startDate && endDate) {
    // Custom date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
  } else {
    // Predefined range
    const rangeDates = getRangeDates(range);
    if (rangeDates) {
      query = query.gte("created_at", rangeDates.start).lte("created_at", rangeDates.end);
    }
  }

  // Get total count for pagination
  const { data: countData, error: countError, count } = await query;
  const totalCount = count || 0;

  if (countError) {
    throw new Error(`Count error: ${countError.message}`);
  }

  // Apply pagination
  query = query.range(from, to);

  const { data: receipts, error } = await query;

  if (error) {
    throw new Error(`Fetch error: ${error.message}`);
  }

  // Get statistics if requested
  let stats = null;
  if (includeStats) {
    stats = await getCachedReceiptsStats(range);
  }

  const responseData = {
    page,
    limit,
    total: totalCount,
    range,
    receipts: receipts ?? [],
    filters: {
      search,
      status,
      startDate,
      endDate
    },
    stats,
    _fromCache: false
  };

  // Cache the successful response
  adminReceiptsCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now()
  });

  console.log(`✅ Cached ${receipts?.length || 0} admin receipts for page ${page}`);
  
  return responseData;
}

// Helper function to extract admin user info from cookies
async function getAdminUserInfo(cookieHeader: string) {
  try {
    // Extract access token from cookies
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (!accessTokenMatch) return null;

    const accessToken = accessTokenMatch[1];
    
    // Verify the token and get user info
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user) {
      console.error('Error getting admin user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error extracting admin user info:', error);
    return null;
  }
}

// Only export HTTP methods
// 📄 GET: List receipts with filters and pagination
export async function GET(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const range = url.searchParams.get("range") ?? "total";
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const startDate = url.searchParams.get("startDate") ?? "";
    const endDate = url.searchParams.get("endDate") ?? "";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const nocache = url.searchParams.get("nocache") === "true";

    // Clear cache if force refresh requested
    if (nocache) {
      clearAdminReceiptsCache({
        page, limit, range, search, status, startDate, endDate, includeStats
      });
      if (includeStats) {
        clearReceiptsStatsCache(range);
      }
      console.log(`🔄 Force refreshing admin receipts data`);
    }

    const result = await getCachedAdminReceipts({
      page,
      limit,
      range,
      search,
      status,
      startDate,
      endDate,
      includeStats
    });

    const { _fromCache, ...cleanResponse } = result;

    // 🕵️ AUDIT LOG: Track receipts list access
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "view_receipts_list",
      resourceType: "Receipt",
      description: `Viewed receipts list with filters: page ${page}, status "${status}", search "${search}"`,
      metadata: {
        page,
        limit,
        range,
        search,
        status,
        startDate,
        endDate,
        includeStats,
        resultsCount: result.receipts.length,
        totalCount: result.total,
        fromCache: _fromCache,
        revenueStats: includeStats ? result.stats : undefined
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({
      ...cleanResponse,
      _cache: {
        cached: _fromCache,
        timestamp: Date.now(),
        page,
        limit,
        range,
        filters: {
          search,
          status,
          startDate,
          endDate
        },
        includeStats
      }
    });
  } catch (err: any) {
    console.error("Server error (receipts route):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "receipts_list_error",
      resourceType: "Receipt",
      description: `Unexpected error accessing receipts list: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ 
      error: err?.message?.includes('Fetch error') 
        ? 'Failed to fetch receipts' 
        : err?.message?.includes('Count error')
        ? 'Failed to count receipts'
        : 'Server error'
    }, { status: 500 });
  }
}

// 🔄 PATCH: Update receipt status
export async function PATCH(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id, status, notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both 'id' and 'status' are required." },
        { status: 400 }
      );
    }

    // Get current receipt state for audit log
    const { data: currentReceipt, error: fetchError } = await supabaseAdmin
      .from("receipts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent receipt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "receipt_update_failed",
        resourceType: "Receipt",
        resourceId: id,
        description: `Failed to update receipt ${id}: Receipt not found`,
        metadata: {
          receiptId: id,
          attemptedStatus: status,
          error: fetchError.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    // Add payment timestamp if marking as paid
    if (status === 'paid' && currentReceipt.status !== 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    // Add cancellation timestamp if marking as cancelled
    if (status === 'cancelled' && currentReceipt.status !== 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    // Add admin notes if provided
    if (notes) {
      updateData.admin_notes = notes;
    }

    const { data, error } = await supabaseAdmin
      .from("receipts")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "receipt_update_failed",
        resourceType: "Receipt",
        resourceId: id,
        description: `Failed to update receipt ${id}: ${error.message}`,
        metadata: {
          receiptId: id,
          receiptNumber: currentReceipt.receipt_id,
          attemptedStatus: status,
          previousStatus: currentReceipt.status,
          error: error.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedReceipt = data?.[0];

    // 🕵️ AUDIT LOG: Track successful status update
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_receipt_status",
      resourceType: "Receipt",
      resourceId: id,
      description: `Updated receipt ${id} status from ${currentReceipt.status} to ${status}`,
      metadata: {
        receiptId: id,
        receiptNumber: currentReceipt.receipt_id,
        customerEmail: currentReceipt.signee_email,
        previousStatus: currentReceipt.status,
        newStatus: status,
        amount: currentReceipt.total_amount,
        adminNotes: notes,
        updatedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for payment
    if (status === 'paid' && currentReceipt.status !== 'paid') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "mark_receipt_paid",
        resourceType: "Receipt",
        resourceId: id,
        description: `Marked receipt ${id} as paid: $${currentReceipt.total_amount}`,
        metadata: {
          receiptId: id,
          receiptNumber: currentReceipt.receipt_id,
          customerEmail: currentReceipt.signee_email,
          amount: currentReceipt.total_amount,
          paidBy: adminUser?.email,
          paymentTime: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for cancellation
    if (status === 'cancelled' && currentReceipt.status !== 'cancelled') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "cancel_receipt",
        resourceType: "Receipt",
        resourceId: id,
        description: `Cancelled receipt ${id}: $${currentReceipt.total_amount}`,
        metadata: {
          receiptId: id,
          receiptNumber: currentReceipt.receipt_id,
          customerEmail: currentReceipt.signee_email,
          amount: currentReceipt.total_amount,
          cancellationNotes: notes,
          cancelledBy: adminUser?.email,
          cancellationTime: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for overdue marking
    if (status === 'overdue' && currentReceipt.status !== 'overdue') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "mark_receipt_overdue",
        resourceType: "Receipt",
        resourceId: id,
        description: `Marked receipt ${id} as overdue: $${currentReceipt.total_amount}`,
        metadata: {
          receiptId: id,
          receiptNumber: currentReceipt.receipt_id,
          customerEmail: currentReceipt.signee_email,
          amount: currentReceipt.total_amount,
          markedBy: adminUser?.email,
          overdueTime: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // 🧹 CLEAR CACHE AFTER STATUS UPDATE
    console.log("🧹 Clearing cache after receipt status update...");
    clearAllAdminReceiptsCache();

    return NextResponse.json({ 
      message: "Receipt updated", 
      data: updatedReceipt,
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (receipts PATCH):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "receipt_update_error",
      resourceType: "Receipt",
      description: `Unexpected error during receipt update: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

// 🗑️ DELETE: Remove a receipt
export async function DELETE(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "'id' is required to delete a receipt." },
        { status: 400 }
      );
    }

    // Get receipt before deletion for audit log
    const { data: receipt, error: fetchError } = await supabaseAdmin
      .from("receipts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent receipt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "receipt_delete_failed",
        resourceType: "Receipt",
        resourceId: id,
        description: `Failed to delete receipt ${id}: Receipt not found`,
        metadata: {
          receiptId: id,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("receipts")
      .delete()
      .eq("id", id);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "receipt_delete_failed",
        resourceType: "Receipt",
        resourceId: id,
        description: `Failed to delete receipt ${id}: ${error.message}`,
        metadata: {
          receiptId: id,
          receiptNumber: receipt.receipt_id,
          receiptStatus: receipt.status,
          amount: receipt.total_amount,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful receipt deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_receipt",
      resourceType: "Receipt",
      resourceId: id,
      description: `Deleted receipt ${id}: ${receipt.receipt_id} - $${receipt.total_amount}`,
      metadata: {
        receiptId: id,
        receiptNumber: receipt.receipt_id,
        receiptStatus: receipt.status,
        customerEmail: receipt.signee_email,
        amount: receipt.total_amount,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString(),
        createdAt: receipt.created_at
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // 🧹 CLEAR CACHE AFTER DELETION
    console.log("🧹 Clearing cache after receipt deletion...");
    clearAllAdminReceiptsCache();

    return NextResponse.json({ 
      message: "Receipt deleted successfully",
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (receipts DELETE):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "receipt_delete_error",
      resourceType: "Receipt",
      description: `Unexpected error during receipt deletion: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

// 📝 POST: Create a new receipt (if you have this functionality)
export async function POST(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const receiptData = await req.json();

    if (!receiptData.receipt_id || !receiptData.total_amount) {
      return NextResponse.json(
        { error: "Receipt ID and total amount are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("receipts")
      .insert({
        ...receiptData,
        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track receipt creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "receipt_creation_failed",
        resourceType: "Receipt",
        description: `Failed to create receipt: ${error.message}`,
        metadata: {
          receiptData,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful receipt creation
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_receipt",
      resourceType: "Receipt",
      resourceId: data.id,
      description: `Created new receipt ${data.receipt_id}: $${data.total_amount}`,
      metadata: {
        receiptId: data.id,
        receiptNumber: data.receipt_id,
        customerEmail: data.signee_email,
        amount: data.total_amount,
        status: data.status,
        createdBy: adminUser?.email,
        creationTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // 🧹 CLEAR CACHE AFTER CREATION
    console.log("🧹 Clearing cache after receipt creation...");
    clearAllAdminReceiptsCache();

    return NextResponse.json({ 
      message: "Receipt created successfully",
      data,
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (receipts POST):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "receipt_creation_error",
      resourceType: "Receipt",
      description: `Unexpected error during receipt creation: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
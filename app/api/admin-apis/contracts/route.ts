// app/api/admin/contracts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ENHANCED ADMIN CONTRACTS CACHE
const adminContractsCache = new Map();
const ADMIN_CONTRACTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Statistics cache (separate for better performance)
const contractsStatsCache = new Map();
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

interface AdminContractsQuery {
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
function clearAdminContractsCache(filters?: Partial<AdminContractsQuery>) {
  if (filters) {
    const cacheKey = `admin_contracts_${filters.page || 1}_${filters.limit || 10}_${filters.range || 'total'}_${filters.search || ''}_${filters.status || ''}_${filters.startDate || ''}_${filters.endDate || ''}_${filters.includeStats || false}`;
    const existed = adminContractsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared specific admin contracts cache: ${cacheKey}`);
    }
    
    return existed;
  } else {
    const count = adminContractsCache.size;
    adminContractsCache.clear();
    console.log(`🧹 Cleared all admin contracts cache (${count} entries)`);
    return count;
  }
}

function clearContractsStatsCache(range?: string) {
  if (range) {
    const cacheKey = `contracts_stats_${range}`;
    const existed = contractsStatsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared contracts stats cache for range: ${range}`);
    }
    
    return existed;
  } else {
    const count = contractsStatsCache.size;
    contractsStatsCache.clear();
    console.log(`🧹 Cleared all contracts stats cache (${count} entries)`);
    return count;
  }
}

function clearAllAdminContractsCache() {
  const contractsCount = clearAdminContractsCache();
  const statsCount = clearContractsStatsCache();
  
  console.log(`🧹 Cleared all admin contracts cache (${contractsCount} contracts, ${statsCount} stats)`);
  return { contractsCount, statsCount };
}

async function getCachedContractsStats(range: string = "total") {
  const cacheKey = `contracts_stats_${range}`;
  const cached = contractsStatsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_TTL) {
    console.log("✅ Using cached contracts statistics");
    return cached.data;
  }
  
  console.log("🔄 Fetching fresh contracts statistics");
  
  const rangeDates = getRangeDates(range);
  
  let statsQuery = supabaseAdmin
    .from("contracts")
    .select("status, fraud_flag, created_at");

  if (rangeDates) {
    statsQuery = statsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: contracts, error } = await statsQuery;

  if (error) {
    console.error("Error fetching contracts stats:", error);
    return null;
  }

  const stats = {
    total: contracts?.length || 0,
    draft: contracts?.filter(f => f.status === "draft").length || 0,
    sent: contracts?.filter(f => f.status === "sent").length || 0,
    signed: contracts?.filter(f => f.status === "signed").length || 0,
    expired: contracts?.filter(f => f.status === "expired").length || 0,
    cancelled: contracts?.filter(f => f.status === "cancelled").length || 0,
    fraudulent: contracts?.filter(f => f.fraud_flag === true).length || 0,
    byMonth: contracts?.reduce((acc, f) => {
      const date = new Date(f.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  };

  contractsStatsCache.set(cacheKey, {
    data: stats,
    timestamp: Date.now()
  });

  return stats;
}

async function getCachedAdminContracts({
  page,
  limit,
  range,
  search,
  status,
  startDate,
  endDate,
  includeStats = false
}: AdminContractsQuery) {
  const cacheKey = `admin_contracts_${page}_${limit}_${range}_${search}_${status}_${startDate}_${endDate}_${includeStats}`;
  const cached = adminContractsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < ADMIN_CONTRACTS_CACHE_TTL) {
    console.log("✅ Using cached admin contracts data");
    return {
      ...cached.data,
      _fromCache: true
    };
  }
  
  console.log("🔄 Fetching fresh admin contracts data from database");
  
  const offset = (page - 1) * limit;

  // Build query
  let query = supabaseAdmin
    .from("contracts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`contract_title.ilike.%${search}%,initiator_email.ilike.%${search}%,signee_email.ilike.%${search}%,signee_name.ilike.%${search}%`);
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
  const { data: contracts, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Fetch error: ${error.message}`);
  }

  // Get statistics if requested
  let stats = null;
  if (includeStats) {
    stats = await getCachedContractsStats(range);
  }

  const responseData = {
    contracts: contracts ?? [],
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    },
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
  adminContractsCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now()
  });

  console.log(`✅ Cached ${contracts?.length || 0} admin contracts for page ${page}`);
  
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


export async function GET(req: NextRequest) {
  try {

 const adminUser = await requireAdmin(req);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'legal_admin', 'operations_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }


    // Auth check
    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader.includes("sb-access-token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const clientInfo = getClientInfo(req.headers);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const range = url.searchParams.get("range") || "total";
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const nocache = url.searchParams.get("nocache") === "true";

    // Clear cache if force refresh requested
    if (nocache) {
      clearAdminContractsCache({
        page, limit, range, search, status, startDate, endDate, includeStats
      });
      if (includeStats) {
        clearContractsStatsCache(range);
      }
      console.log(`🔄 Force refreshing admin contracts data`);
    }

    const result = await getCachedAdminContracts({
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
    console.error("Contracts API error:", err);
    
    return NextResponse.json({ 
      error: err?.message?.includes('Fetch error') 
        ? 'Failed to fetch contracts' 
        : err?.message?.includes('Count error')
        ? 'Failed to count contracts'
        : 'Server error'
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader.includes("sb-access-token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
 const adminUser = await requireAdmin(req);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'legal_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

    const clientInfo = getClientInfo(req.headers);

    const { id, status, fraud_flag, fraud_reason } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    }

    // Get current contract state for audit log
    const { data: currentContract, error: fetchError } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current contract:", fetchError);
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (fraud_flag !== undefined) updates.fraud_flag = fraud_flag;
    if (fraud_reason) updates.fraud_reason = fraud_reason;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("contracts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating contract:", error);
      
      // 🕵️ AUDIT LOG: Track failed update
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "update_contract_failed",
        resourceType: "Contract",
        resourceId: id,
        description: `Failed to update contract ${id}: ${error.message}`,
        metadata: {
          contractId: id,
          attemptedUpdates: updates,
          error: error.message,
          currentStatus: currentContract.status,
          currentFraudFlag: currentContract.fraud_flag
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
      
      return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful contract update
    const changedFields = [];
    if (status && status !== currentContract.status) changedFields.push('status');
    if (fraud_flag !== undefined && fraud_flag !== currentContract.fraud_flag) changedFields.push('fraud_flag');
    if (fraud_reason && fraud_reason !== currentContract.fraud_reason) changedFields.push('fraud_reason');

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_contract",
      resourceType: "Contract",
      resourceId: id,
      description: `Updated contract ${id}: ${changedFields.join(', ')}`,
      metadata: {
        contractId: id,
        changedFields,
        previousValues: {
          status: currentContract.status,
          fraud_flag: currentContract.fraud_flag,
          fraud_reason: currentContract.fraud_reason
        },
        newValues: {
          status: data.status,
          fraud_flag: data.fraud_flag,
          fraud_reason: data.fraud_reason
        },
        contractTitle: data.contract_title,
        initiatorEmail: data.initiator_email,
        signeeEmail: data.signee_email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for fraud flag changes
    if (fraud_flag !== undefined && fraud_flag !== currentContract.fraud_flag) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: fraud_flag ? "flag_contract_fraud" : "unflag_contract_fraud",
        resourceType: "Contract",
        resourceId: id,
        description: `Contract ${id} ${fraud_flag ? 'flagged as fraudulent' : 'unflagged from fraud'}${fraud_reason ? `: ${fraud_reason}` : ''}`,
        metadata: {
          contractId: id,
          previousFraudFlag: currentContract.fraud_flag,
          newFraudFlag: fraud_flag,
          fraudReason: fraud_reason,
          contractTitle: data.contract_title
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for status changes
    if (status && status !== currentContract.status) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: `contract_status_${status}`,
        resourceType: "Contract",
        resourceId: id,
        description: `Contract ${id} status changed from ${currentContract.status} to ${status}`,
        metadata: {
          contractId: id,
          previousStatus: currentContract.status,
          newStatus: status,
          contractTitle: data.contract_title
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // 🧹 CLEAR CACHE AFTER UPDATE
    console.log("🧹 Clearing cache after contract update...");
    clearAllAdminContractsCache();

    return NextResponse.json({ 
      contract: data,
      cacheCleared: true,
      auditLogged: true
    });
  } catch (error) {
    console.error("Contract update error:", error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await getAdminUserInfo(req.headers.get("cookie") || "");
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "contract_update_error",
      resourceType: "Contract",
      description: `Unexpected error during contract update: ${error}`,
      metadata: {
        error: error,
        stack: error
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
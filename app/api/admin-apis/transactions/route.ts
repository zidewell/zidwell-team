// app/api/admin-apis/transactions/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from '@/lib/admin-auth';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ENHANCED ADMIN TRANSACTIONS CACHE
const adminTransactionsCache = new Map();
const ADMIN_TRANSACTIONS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Statistics cache (separate for better performance)
const transactionsStatsCache = new Map();
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

interface AdminTransactionsQuery {
  page: number;
  limit: number;
  range: string;
  search: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  userId?: string;
  includeStats?: boolean;
}

// Cache management functions
function clearAdminTransactionsCache(filters?: Partial<AdminTransactionsQuery>) {
  if (filters) {
    const cacheKey = `admin_transactions_${filters.page || 1}_${filters.limit || 20}_${filters.range || 'total'}_${filters.search || ''}_${filters.type || ''}_${filters.status || ''}_${filters.startDate || ''}_${filters.endDate || ''}_${filters.userId || 'all'}_${filters.includeStats || false}`;
    const existed = adminTransactionsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared specific admin transactions cache: ${cacheKey}`);
    }
    
    return existed;
  } else {
    const count = adminTransactionsCache.size;
    adminTransactionsCache.clear();
    console.log(`🧹 Cleared all admin transactions cache (${count} entries)`);
    return count;
  }
}

function clearTransactionsStatsCache(range?: string, userId?: string) {
  if (range || userId) {
    const cacheKey = `transactions_stats_${range || 'total'}_${userId || 'all'}`;
    const existed = transactionsStatsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared transactions stats cache for range: ${range}, user: ${userId}`);
    }
    
    return existed;
  } else {
    const count = transactionsStatsCache.size;
    transactionsStatsCache.clear();
    console.log(`🧹 Cleared all transactions stats cache (${count} entries)`);
    return count;
  }
}

function clearAllAdminTransactionsCache() {
  const transactionsCount = clearAdminTransactionsCache();
  const statsCount = clearTransactionsStatsCache();
  
  console.log(`🧹 Cleared all admin transactions cache (${transactionsCount} transactions, ${statsCount} stats)`);
  return { transactionsCount, statsCount };
}

// IMPROVED: Correct fee calculation function
async function getCachedTransactionsStats(range: string = "total", userId?: string) {
  const cacheKey = `transactions_stats_${range}_${userId || 'all'}`;
  const cached = transactionsStatsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_TTL) {
    console.log("✅ Using cached transactions statistics");
    return cached.data;
  }
  
  console.log("🔄 Fetching fresh transactions statistics");
  
  const rangeDates = getRangeDates(range);
  
  // Fetch ALL transactions with fee data
  let statsQuery = supabaseAdmin
    .from("transactions")
    .select("status, type, amount, fee, user_id, created_at, description, reference");

  if (rangeDates) {
    statsQuery = statsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  if (userId) {
    statsQuery = statsQuery.eq("user_id", userId);
  }

  const { data: transactions, error } = await statsQuery;

  if (error) {
    console.error("Error fetching transactions stats:", error);
    return null;
  }

  console.log(`📊 DEBUG: Fetched ${transactions?.length || 0} transactions for stats`);
  
  // DEBUG: Show fee distribution
  const feeCounts = {
    hasFee: 0,
    noFee: 0,
    zeroFee: 0,
    nullFee: 0,
    emptyFee: 0
  };

  transactions?.forEach(t => {
    if (t.fee === null) feeCounts.nullFee++;
    else if (t.fee === "") feeCounts.emptyFee++;
    else if (Number(t.fee) === 0) feeCounts.zeroFee++;
    else if (t.fee) feeCounts.hasFee++;
    else feeCounts.noFee++;
  });

  console.log(`📊 DEBUG: Fee distribution:`, feeCounts);
  
  // Calculate user fees - ROBUST PARSING
  const userFees = transactions?.reduce((acc, t) => {
    const userId = t.user_id;
    if (!userId) return acc;
    
    // SAFE FEE PARSING - handles all cases from your CSV
    let feeValue = 0;
    try {
      if (t.fee !== null && t.fee !== undefined && t.fee !== "") {
        // Convert to string and clean
        const feeStr = String(t.fee).trim();
        if (feeStr && feeStr !== "0" && feeStr !== "0.00") {
          // Remove any non-numeric characters except decimal point and minus
          const cleanFee = feeStr.replace(/[^0-9.-]+/g, '');
          const parsed = parseFloat(cleanFee);
          feeValue = isNaN(parsed) ? 0 : parsed;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Fee parse error for user ${userId}: ${t.fee}`);
      feeValue = 0;
    }
    
    if (!acc[userId]) {
      acc[userId] = {
        total_fee: 0,
        transaction_count: 0,
        successful_transactions: 0,
        failed_transactions: 0,
        pending_transactions: 0,
        last_transaction: t.created_at,
        first_transaction: t.created_at
      };
    }
    
    acc[userId].total_fee += feeValue;
    acc[userId].transaction_count += 1;
    
    // Count by status
    if (t.status === "success") acc[userId].successful_transactions += 1;
    else if (t.status === "failed") acc[userId].failed_transactions += 1;
    else if (t.status === "pending") acc[userId].pending_transactions += 1;
    
    // Update date ranges
    if (t.created_at > acc[userId].last_transaction) {
      acc[userId].last_transaction = t.created_at;
    }
    if (t.created_at < acc[userId].first_transaction) {
      acc[userId].first_transaction = t.created_at;
    }
    
    return acc;
  }, {} as Record<string, {
    total_fee: number;
    transaction_count: number;
    successful_transactions: number;
    failed_transactions: number;
    pending_transactions: number;
    last_transaction: string;
    first_transaction: string;
  }>);

  // Convert userFees object to sorted array
  const userFeesArray = Object.entries(userFees || {}).map(([user_id, data]) => ({
    user_id,
    ...data
  })).sort((a, b) => b.total_fee - a.total_fee); // Sort by highest fee

  // Calculate overall totals
  const totalFeeAllUsers = userFeesArray.reduce((sum, user) => sum + user.total_fee, 0);
  const totalAmountAllUsers = transactions
    ?.filter(t => t.status === "success")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

  console.log(`📊 DEBUG: Calculated total fees: ₦${totalFeeAllUsers.toFixed(2)}`);
  console.log(`📊 DEBUG: Expected from CSV: ₦2028.39`);
  console.log(`📊 DEBUG: Difference: ₦${(totalFeeAllUsers - 2028.39).toFixed(2)}`);

  const stats = {
    total: transactions?.length || 0,
    successful: transactions?.filter(t => t.status === "success").length || 0,
    failed: transactions?.filter(t => t.status === "failed").length || 0,
    pending: transactions?.filter(t => t.status === "pending").length || 0,
    processing: transactions?.filter(t => t.status === "processing").length || 0,
    totalAmount: totalAmountAllUsers,
    // Fee statistics
    totalFee: totalFeeAllUsers,
    averageFeePerUser: userFeesArray.length > 0 ? totalFeeAllUsers / userFeesArray.length : 0,
    userFees: userFeesArray,
    topUsersByFee: userFeesArray.slice(0, 10),
    // Distribution
    byType: transactions?.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    byStatus: {
      success: transactions?.filter(t => t.status === "success").length || 0,
      failed: transactions?.filter(t => t.status === "failed").length || 0,
      pending: transactions?.filter(t => t.status === "pending").length || 0,
      processing: transactions?.filter(t => t.status === "processing").length || 0
    },
    // Debug info
    _debug: {
      feeDistribution: feeCounts,
      userCount: userFeesArray.length,
      calculationTimestamp: new Date().toISOString()
    }
  };

  transactionsStatsCache.set(cacheKey, {
    data: stats,
    timestamp: Date.now()
  });

  console.log(`✅ Cached transactions stats for ${range}${userId ? ` (user: ${userId})` : ''}`);
  
  return stats;
}

async function getCachedAdminTransactions({
  page,
  limit,
  range,
  search,
  type,
  status,
  startDate,
  endDate,
  userId,
  includeStats = false
}: AdminTransactionsQuery) {
  const cacheKey = `admin_transactions_${page}_${limit}_${range}_${search}_${type}_${status}_${startDate}_${endDate}_${userId || 'all'}_${includeStats}`;
  const cached = adminTransactionsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < ADMIN_TRANSACTIONS_CACHE_TTL) {
    console.log("✅ Using cached admin transactions data");
    return {
      ...cached.data,
      _fromCache: true
    };
  }
  
  console.log("🔄 Fetching fresh admin transactions data from database");
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build the query
  let query = supabaseAdmin
    .from("transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply user filter first (if specific user)
  if (userId) {
    query = query.eq("user_id", userId);
  }

  // Apply search filter - enhanced to search across multiple fields including user data
  if (search && !userId) {
    query = query.or(`
      reference.ilike.%${search}%,
      user_id.ilike.%${search}%,
      description.ilike.%${search}%,
      phone_number.ilike.%${search}%,
      user_email.ilike.%${search}%,
      user_name.ilike.%${search}%
    `);
  }

  // Apply type filter
  if (type && type !== 'all') {
    query = query.eq("type", type);
  }

  // Apply status filter
  if (status && status !== 'all') {
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

  const { data: transactions, error } = await query;

  if (error) {
    throw new Error(`Fetch error: ${error.message}`);
  }

  // Get statistics if requested
  let stats = null;
  if (includeStats) {
    stats = await getCachedTransactionsStats(range, userId);
  }

  const responseData = {
    page,
    limit,
    total: totalCount,
    range,
    transactions: transactions ?? [],
    filters: {
      search,
      type,
      status,
      startDate,
      endDate,
      userId
    },
    stats,
    _fromCache: false
  };

  // Cache the successful response
  adminTransactionsCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now()
  });

  console.log(`✅ Cached ${transactions?.length || 0} admin transactions for page ${page}`);
  
  return responseData;
}

// NEW: Direct fee calculation endpoint
async function calculateUserFeesDirectly(range: string = "total") {
  const rangeDates = getRangeDates(range);
  
  // Simple direct query - no complex joins
  let query = supabaseAdmin
    .from("transactions")
    .select("user_id, fee, status, created_at")
    .order("created_at", { ascending: false });

  if (rangeDates) {
    query = query
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error("Direct fee calculation error:", error);
    return null;
  }

  // Manual calculation matching CSV logic
  const userFees: Record<string, {
    total_fee: number;
    transactions: number;
    sample_fees: string[];
  }> = {};

  let grandTotal = 0;
  let processedCount = 0;

  transactions?.forEach(t => {
    const userId = t.user_id;
    if (!userId) return;

    // Parse fee exactly like CSV would
    let feeValue = 0;
    
    if (t.fee !== null && t.fee !== undefined && t.fee !== "") {
      const feeStr = String(t.fee).trim();
      // Direct numeric conversion
      const num = Number(feeStr);
      feeValue = isNaN(num) ? 0 : num;
    }

    if (!userFees[userId]) {
      userFees[userId] = {
        total_fee: 0,
        transactions: 0,
        sample_fees: []
      };
    }

    userFees[userId].total_fee += feeValue;
    userFees[userId].transactions += 1;
    
    // Keep a few sample fee values for debugging
    if (userFees[userId].sample_fees.length < 3 && t.fee) {
      userFees[userId].sample_fees.push(`${t.fee} (→ ${feeValue})`);
    }

    grandTotal += feeValue;
    processedCount++;
  });

  // Convert to array and sort
  const userFeesArray = Object.entries(userFees).map(([user_id, data]) => ({
    user_id,
    total_fee: Number(data.total_fee.toFixed(2)),
    transactions: data.transactions,
    average_fee: Number((data.total_fee / data.transactions).toFixed(2)),
    sample_fees: data.sample_fees
  })).sort((a, b) => b.total_fee - a.total_fee);

  return {
    calculation_method: "direct_fee_sum",
    calculation_timestamp: new Date().toISOString(),
    range_applied: range,
    range_dates: rangeDates,
    total_transactions_processed: processedCount,
    total_users: userFeesArray.length,
    grand_total_fee: Number(grandTotal.toFixed(2)),
    expected_csv_total: 2028.39,
    difference_from_csv: Number((grandTotal - 2028.39).toFixed(2)),
    user_fees: userFeesArray,
    summary: {
      top_payer: userFeesArray[0] || null,
      bottom_payer: userFeesArray[userFeesArray.length - 1] || null,
      average_per_user: Number((grandTotal / userFeesArray.length).toFixed(2))
    }
  };
}

// Main GET endpoint
export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin', 'legal_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const range = url.searchParams.get("range") ?? "total";
    const search = url.searchParams.get("search") ?? "";
    const type = url.searchParams.get("type") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const startDate = url.searchParams.get("startDate") ?? "";
    const endDate = url.searchParams.get("endDate") ?? "";
    const userId = url.searchParams.get("userId") ?? "";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const nocache = url.searchParams.get("nocache") === "true";
    const directFees = url.searchParams.get("directFees") === "true"; // New parameter

    // Special endpoint for direct fee calculation
    if (directFees) {
      const feesData = await calculateUserFeesDirectly(range);
      return NextResponse.json({
        success: true,
        data: feesData,
        _admin: {
          performedBy: adminUser?.email,
          performedAt: new Date().toISOString()
        }
      });
    }

    // Clear cache if force refresh requested
    if (nocache) {
      clearAdminTransactionsCache({
        page, limit, range, search, type, status, startDate, endDate, userId, includeStats
      });
      if (includeStats) {
        clearTransactionsStatsCache(range, userId);
      }
      console.log(`🔄 Force refreshing admin transactions data`);
    }

    const result = await getCachedAdminTransactions({
      page,
      limit,
      range,
      search,
      type,
      status,
      startDate,
      endDate,
      userId: userId || undefined,
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
          type,
          status,
          startDate,
          endDate,
          userId
        },
        includeStats
      },
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("Server error (transactions route):", err);
    
    return NextResponse.json({ 
      error: err?.message?.includes('Fetch error') 
        ? 'Failed to fetch transactions' 
        : err?.message?.includes('Count error')
        ? 'Failed to count transactions'
        : 'Server error'
    }, { status: 500 });
  }
}

// NEW: POST endpoint for advanced fee analysis
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin', 'legal_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const range = url.searchParams.get("range") ?? "total";
    const userId = url.searchParams.get("userId") ?? "";

    if (action === "verifyFees") {
      // Clear cache for fresh data
      clearTransactionsStatsCache(range, userId || undefined);
      
      // Get fresh stats
      const stats = await getCachedTransactionsStats(range, userId || undefined);
      
      // Also do direct calculation for comparison
      const directCalculation = await calculateUserFeesDirectly(range);
      
      return NextResponse.json({
        success: true,
        verification: {
          timestamp: new Date().toISOString(),
          range,
          userId: userId || "all",
          cached_stats: stats,
          direct_calculation: directCalculation,
          comparison: {
            stats_total_fee: stats?.totalFee || 0,
            direct_total_fee: directCalculation?.grand_total_fee || 0,
            csv_expected: 2028.39,
            stats_vs_csv: stats ? (stats.totalFee - 2028.39).toFixed(2) : "N/A",
            direct_vs_csv: directCalculation ? (directCalculation.grand_total_fee - 2028.39).toFixed(2) : "N/A"
          }
        },
        _admin: {
          performedBy: adminUser?.email,
          performedAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ 
      error: "Invalid action", 
      available_actions: ["verifyFees"] 
    }, { status: 400 });

  } catch (err: any) {
    console.error("POST error (transactions route):", err);
    return NextResponse.json({ 
      error: "Server error",
      details: err.message 
    }, { status: 500 });
  }
}
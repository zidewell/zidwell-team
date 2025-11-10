// app/api/admin-apis/tax-filings/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ENHANCED ADMIN TAX FILINGS CACHE
const adminTaxFilingsCache = new Map();
const ADMIN_TAX_FILINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Statistics cache (separate for better performance)
const taxFilingsStatsCache = new Map();
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

interface AdminTaxFilingsQuery {
  page: number;
  limit: number;
  range: string;
  search: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  includeStats?: boolean;
}

// Cache management functions - NOT EXPORTED
function clearAdminTaxFilingsCache(filters?: Partial<AdminTaxFilingsQuery>) {
  if (filters) {
    const cacheKey = `admin_tax_filings_${filters.page || 1}_${filters.limit || 10}_${filters.range || 'total'}_${filters.search || ''}_${filters.status || ''}_${filters.type || ''}_${filters.startDate || ''}_${filters.endDate || ''}_${filters.includeStats || false}`;
    const existed = adminTaxFilingsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared specific admin tax filings cache: ${cacheKey}`);
    }
    
    return existed;
  } else {
    const count = adminTaxFilingsCache.size;
    adminTaxFilingsCache.clear();
    console.log(`🧹 Cleared all admin tax filings cache (${count} entries)`);
    return count;
  }
}

function clearTaxFilingsStatsCache(range?: string) {
  if (range) {
    const cacheKey = `tax_filings_stats_${range}`;
    const existed = taxFilingsStatsCache.delete(cacheKey);
    
    if (existed) {
      console.log(`🧹 Cleared tax filings stats cache for range: ${range}`);
    }
    
    return existed;
  } else {
    const count = taxFilingsStatsCache.size;
    taxFilingsStatsCache.clear();
    console.log(`🧹 Cleared all tax filings stats cache (${count} entries)`);
    return count;
  }
}

function clearAllAdminTaxFilingsCache() {
  const filingsCount = clearAdminTaxFilingsCache();
  const statsCount = clearTaxFilingsStatsCache();
  
  console.log(`🧹 Cleared all admin tax filings cache (${filingsCount} filings, ${statsCount} stats)`);
  return { filingsCount, statsCount };
}

async function getCachedTaxFilingsStats(range: string = "total") {
  const cacheKey = `tax_filings_stats_${range}`;
  const cached = taxFilingsStatsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_TTL) {
    console.log("✅ Using cached tax filings statistics");
    return cached.data;
  }
  
  console.log("🔄 Fetching fresh tax filings statistics");
  
  const rangeDates = getRangeDates(range);
  
  let statsQuery = supabaseAdmin
    .from("tax_filings")
    .select("status, filing_type, created_at");

  if (rangeDates) {
    statsQuery = statsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: filings, error } = await statsQuery;

  if (error) {
    console.error("Error fetching tax filings stats:", error);
    return null;
  }

  const stats = {
    total: filings?.length || 0,
    pending: filings?.filter(f => f.status === "pending").length || 0,
    submitted: filings?.filter(f => f.status === "submitted").length || 0,
    approved: filings?.filter(f => f.status === "approved").length || 0,
    rejected: filings?.filter(f => f.status === "rejected").length || 0,
    byType: filings?.reduce((acc, f) => {
      acc[f.filing_type] = (acc[f.filing_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    byMonth: filings?.reduce((acc, f) => {
      const date = new Date(f.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  };

  taxFilingsStatsCache.set(cacheKey, {
    data: stats,
    timestamp: Date.now()
  });

  return stats;
}

async function getCachedAdminTaxFilings({
  page,
  limit,
  range,
  search,
  status,
  type,
  startDate,
  endDate,
  includeStats = false
}: AdminTaxFilingsQuery) {
  const cacheKey = `admin_tax_filings_${page}_${limit}_${range}_${search}_${status}_${type}_${startDate}_${endDate}_${includeStats}`;
  const cached = adminTaxFilingsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < ADMIN_TAX_FILINGS_CACHE_TTL) {
    console.log("✅ Using cached admin tax filings data");
    return {
      ...cached.data,
      _fromCache: true
    };
  }
  
  console.log("🔄 Fetching fresh admin tax filings data from database");
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build the query
  let query = supabaseAdmin
    .from("tax_filings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply search filter
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,nin.ilike.%${search}%`);
  }

  // Apply status filter
  if (status) {
    query = query.eq("status", status);
  }

  // Apply type filter
  if (type) {
    query = query.eq("filing_type", type);
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

  const { data: filings, error } = await query;

  if (error) {
    throw new Error(`Fetch error: ${error.message}`);
  }

  // Get statistics if requested
  let stats = null;
  if (includeStats) {
    stats = await getCachedTaxFilingsStats(range);
  }

  const responseData = {
    page,
    limit,
    total: totalCount,
    range,
    filings: filings ?? [],
    filters: {
      search,
      status,
      type,
      startDate,
      endDate
    },
    stats,
    _fromCache: false
  };

  // Cache the successful response
  adminTaxFilingsCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now()
  });

  console.log(`✅ Cached ${filings?.length || 0} admin tax filings for page ${page}`);
  
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
// 📄 GET: List tax filings with filters and pagination
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
    const type = url.searchParams.get("type") ?? "";
    const startDate = url.searchParams.get("startDate") ?? "";
    const endDate = url.searchParams.get("endDate") ?? "";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const nocache = url.searchParams.get("nocache") === "true";

    // Clear cache if force refresh requested
    if (nocache) {
      clearAdminTaxFilingsCache({
        page, limit, range, search, status, type, startDate, endDate, includeStats
      });
      if (includeStats) {
        clearTaxFilingsStatsCache(range);
      }
      console.log(`🔄 Force refreshing admin tax filings data`);
    }

    const result = await getCachedAdminTaxFilings({
      page,
      limit,
      range,
      search,
      status,
      type,
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
          type,
          startDate,
          endDate
        },
        includeStats
      }
    });
  } catch (err: any) {
    console.error("Server error (tax-filings route):", err);
 
    return NextResponse.json({ 
      error: err?.message?.includes('Fetch error') 
        ? 'Failed to fetch tax filings' 
        : err?.message?.includes('Count error')
        ? 'Failed to count tax filings'
        : 'Server error'
    }, { status: 500 });
  }
}

// 🔄 PATCH: Update filing status
export async function PATCH(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id, status, review_notes, reviewer_comments } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both 'id' and 'status' are required." },
        { status: 400 }
      );
    }

    // Get current filing state for audit log
    const { data: currentFiling, error: fetchError } = await supabaseAdmin
      .from("tax_filings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent filing
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_update_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to update tax filing ${id}: Filing not found`,
        metadata: {
          filingId: id,
          attemptedStatus: status,
          error: fetchError.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Tax filing not found" }, { status: 404 });
    }

    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    // Add review timestamp if being reviewed
    if (status === 'submitted' && currentFiling.status !== 'submitted') {
      updateData.submitted_at = new Date().toISOString();
    }

    // Add approval timestamp if approved
    if (status === 'approved' && currentFiling.status !== 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = adminUser?.id;
    }

    // Add rejection timestamp if rejected
    if (status === 'rejected' && currentFiling.status !== 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = adminUser?.id;
    }

    // Add review notes if provided
    if (review_notes) {
      updateData.review_notes = review_notes;
    }

    // Add reviewer comments if provided
    if (reviewer_comments) {
      updateData.reviewer_comments = reviewer_comments;
    }

    const { data, error } = await supabaseAdmin
      .from("tax_filings")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_update_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to update tax filing ${id}: ${error.message}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          filingType: currentFiling.filing_type,
          attemptedStatus: status,
          previousStatus: currentFiling.status,
          error: error.message
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedFiling = data?.[0];

    // 🕵️ AUDIT LOG: Track successful status update
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_tax_filing_status",
      resourceType: "TaxFiling",
      resourceId: id,
      description: `Updated tax filing ${id} status from ${currentFiling.status} to ${status}`,
      metadata: {
        filingId: id,
        taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
        companyName: currentFiling.company_name,
        nin: currentFiling.nin,
        filingType: currentFiling.filing_type,
        previousStatus: currentFiling.status,
        newStatus: status,
        reviewNotes: review_notes,
        reviewerComments: reviewer_comments,
        updatedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for approval
    if (status === 'approved' && currentFiling.status !== 'approved') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "approve_tax_filing",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Approved tax filing for ${currentFiling.first_name} ${currentFiling.last_name} (${currentFiling.filing_type})`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          companyName: currentFiling.company_name,
          nin: currentFiling.nin,
          filingType: currentFiling.filing_type,
          approvedBy: adminUser?.email,
          approvalTime: new Date().toISOString(),
          reviewerComments: reviewer_comments
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for rejection
    if (status === 'rejected' && currentFiling.status !== 'rejected') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reject_tax_filing",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Rejected tax filing for ${currentFiling.first_name} ${currentFiling.last_name} (${currentFiling.filing_type})`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          companyName: currentFiling.company_name,
          nin: currentFiling.nin,
          filingType: currentFiling.filing_type,
          rejectedBy: adminUser?.email,
          rejectionTime: new Date().toISOString(),
          rejectionReason: review_notes,
          reviewerComments: reviewer_comments
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for submission
    if (status === 'submitted' && currentFiling.status !== 'submitted') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "submit_tax_filing",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Marked tax filing as submitted for ${currentFiling.first_name} ${currentFiling.last_name}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          companyName: currentFiling.company_name,
          filingType: currentFiling.filing_type,
          submittedBy: adminUser?.email,
          submissionTime: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // 🧹 CLEAR CACHE AFTER STATUS UPDATE
    console.log("🧹 Clearing cache after tax filing status update...");
    clearAllAdminTaxFilingsCache();

    return NextResponse.json({ 
      message: "Tax filing status updated", 
      data: updatedFiling,
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (tax-filings PATCH):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "tax_filing_update_error",
      resourceType: "TaxFiling",
      description: `Unexpected error during tax filing update: ${err.message}`,
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

// 🗑️ DELETE: Remove a filing
export async function DELETE(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "'id' is required to delete a filing." },
        { status: 400 }
      );
    }

    // Get filing before deletion for audit log
    const { data: filing, error: fetchError } = await supabaseAdmin
      .from("tax_filings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent filing
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_delete_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to delete tax filing ${id}: Filing not found`,
        metadata: {
          filingId: id,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Tax filing not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("tax_filings")
      .delete()
      .eq("id", id);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_delete_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to delete tax filing ${id}: ${error.message}`,
        metadata: {
          filingId: id,
          taxpayerName: `${filing.first_name} ${filing.last_name}`,
          filingType: filing.filing_type,
          filingStatus: filing.status,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful tax filing deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_tax_filing",
      resourceType: "TaxFiling",
      resourceId: id,
      description: `Deleted tax filing for ${filing.first_name} ${filing.last_name} (${filing.filing_type})`,
      metadata: {
        filingId: id,
        taxpayerName: `${filing.first_name} ${filing.last_name}`,
        companyName: filing.company_name,
        nin: filing.nin,
        filingType: filing.filing_type,
        filingStatus: filing.status,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString(),
        createdAt: filing.created_at
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // 🧹 CLEAR CACHE AFTER DELETION
    console.log("🧹 Clearing cache after tax filing deletion...");
    clearAllAdminTaxFilingsCache();

    return NextResponse.json({ 
      message: "Tax filing deleted successfully",
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (tax-filings DELETE):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "tax_filing_delete_error",
      resourceType: "TaxFiling",
      description: `Unexpected error during tax filing deletion: ${err.message}`,
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

// 📝 POST: Create a new tax filing (if you have this functionality)
export async function POST(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const filingData = await req.json();

    if (!filingData.first_name || !filingData.last_name || !filingData.filing_type) {
      return NextResponse.json(
        { error: "First name, last name, and filing type are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tax_filings")
      .insert({
        ...filingData,
        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track filing creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_creation_failed",
        resourceType: "TaxFiling",
        description: `Failed to create tax filing: ${error.message}`,
        metadata: {
          filingData,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful tax filing creation
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_tax_filing",
      resourceType: "TaxFiling",
      resourceId: data.id,
      description: `Created new tax filing for ${data.first_name} ${data.last_name} (${data.filing_type})`,
      metadata: {
        filingId: data.id,
        taxpayerName: `${data.first_name} ${data.last_name}`,
        companyName: data.company_name,
        nin: data.nin,
        filingType: data.filing_type,
        status: data.status,
        createdBy: adminUser?.email,
        creationTime: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // 🧹 CLEAR CACHE AFTER CREATION
    console.log("🧹 Clearing cache after tax filing creation...");
    clearAllAdminTaxFilingsCache();

    return NextResponse.json({ 
      message: "Tax filing created successfully",
      data,
      cacheCleared: true,
      auditLogged: true
    });
  } catch (err: any) {
    console.error("Server error (tax-filings POST):", err);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "tax_filing_creation_error",
      resourceType: "TaxFiling",
      description: `Unexpected error during tax filing creation: ${err.message}`,
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
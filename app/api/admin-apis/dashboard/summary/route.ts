// app/api/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SUMMARY DATA CACHE
const summaryCache = new Map();
const SUMMARY_CACHE_TTL = 1 * 60 * 1000; // 2 minutes

// Nomba caching (1 minute)
let _cachedNomba = { ts: 0, value: 0 };
const NOMBA_CACHE_TTL = 60 * 1000;

async function fetchNombaBalanceCached(
  getTokenFn: () => Promise<string | null>
): Promise<number> {
  try {
    const now = Date.now();
    if (now - _cachedNomba.ts < NOMBA_CACHE_TTL) {
      console.log("Using cached Nomba balance");
      return _cachedNomba.value;
    }

    const token = await getTokenFn();
    if (!token) {
      console.warn("No Nomba token available");
      return 0;
    }

    const res = await fetch(
      `${process.env.NOMBA_URL ?? ""}/v1/accounts/balance`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: process.env.NOMBA_ACCOUNT_ID ?? "",
        },
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Nomba fetch failed:", res.status, txt);
      return 0;
    }

    const data = await res.json().catch(() => ({}));
    const amount = Number(data?.data?.amount ?? 0);
    _cachedNomba = { ts: now, value: amount };
    return amount;
  } catch (err) {
    console.error("Error fetching Nomba balance:", err);
    return 0;
  }
}

function parseRangeToDates(range: string | null): { start: string; end: string } | null {
  if (!range || range === "total") return null;
  const now = new Date();
  let start = new Date(now);
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
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      return null;
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildMonthLabelsFromRange(
  rangeDates: { start: string; end: string } | null
): string[] {
  const labels: string[] = [];
  if (!rangeDates) {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        d.toLocaleString("default", { month: "short", year: "numeric" })
      );
    }
  } else {
    const start = new Date(rangeDates.start);
    const end = new Date(rangeDates.end);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      labels.push(
        cur.toLocaleString("default", { month: "short", year: "numeric" })
      );
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return labels;
}

// Cache management functions - NOT EXPORTED
function clearSummaryCache(range?: string): boolean | number {
  if (range) {
    // Clear specific range cache
    const cacheKey = `summary_${range}`;
    const existed = summaryCache.delete(cacheKey);
    if (existed) {
      console.log(`🧹 Cleared summary cache for range: ${range}`);
    }
    return existed;
  } else {
    // Clear all summary cache
    const count = summaryCache.size;
    summaryCache.clear();
    console.log(`🧹 Cleared all summary cache (${count} entries)`);
    return count;
  }
}

function clearSummaryCacheForEvents(): void {
  // Clear all time ranges since events affect all time periods
  clearSummaryCache();
  console.log("🧹 Cleared summary cache due to system event");
}

// Optional: Periodic cache cleanup
function cleanupExpiredSummaryCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of summaryCache) {
    if (now - value.timestamp > SUMMARY_CACHE_TTL) {
      summaryCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired summary cache entries`);
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSummaryCache, 5 * 60 * 1000);
}

async function getCachedSummaryData(rangeParam: string): Promise<any> {
  const cacheKey = `summary_${rangeParam}`;
  const cached = summaryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < SUMMARY_CACHE_TTL) {
    console.log("✅ Using cached summary data");
    return {
      ...cached.data,
      _fromCache: true
    };
  }
  
  console.log("🔄 Fetching fresh summary data from database");
  
  const rangeDates = parseRangeToDates(rangeParam);

  // --- Transactions (apply range if provided) ---
  let txQuery = supabaseAdmin
    .from("transactions")
    .select("id, amount, type, status, created_at, description, fee, total_deduction")
    .order("created_at", { ascending: false });
  
  if (rangeDates) {
    txQuery = txQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: transactionsData, error: txError } = await txQuery;
  if (txError) {
    console.error("[/api/summary] error fetching transactions:", txError);
  } else {
    console.log(
      "[/api/summary] transactions fetched:",
      transactionsData?.length || 0,
      "including all statuses"
    );
  }

  // Always ensure transactions is an array, even if null
  const transactions = transactionsData || [];

  // Transaction aggregates
  const INFLOW_TYPES = [
    "deposit",
    "card_deposit",
    "bank_transfer",
    "p2p_received",
    "invoice_payment",
    "payment_received",
    "refund",
    "reversal",
    "credit",
    "topup",
    "funding",
    "payment",
    "transfer"
  ];

  const OUTFLOW_TYPES = [
    "withdrawal",
    "transfer",
    "p2p_sent",
    "airtime",
    "data",
    "electricity",
    "cable",
    "bank_charge",
    "debit",
    "payment",
    "charge",
    "fee",
    "commission",
    "service_fee",
    "transaction_fee",
    "convenience_fee",
    "processing_fee",
    "platform_fee"
  ];

  const totalTransactions = transactions.length;

  // Filter transactions by status
  const successfulTransactions = transactions.filter(
    (t: any) => t.status === "success"
  );
  const failedTransactions = transactions.filter(
    (t: any) => t.status === "failed"
  );
  const pendingTransactions = transactions.filter(
    (t: any) => t.status === "pending"
  );

  // Debug logging
  if (successfulTransactions.length > 0) {
    const uniqueTypes = Array.from(new Set(successfulTransactions.map((t: any) => t.type)));
    console.log("[/api/summary] Unique transaction types found:", uniqueTypes);
  } else {
    console.log("[/api/summary] No successful transactions found");
  }

  // Financial calculations - ONLY SUCCESSFUL TRANSACTIONS
  const totalInflow = successfulTransactions
    .filter((t: any) => {
      const typeLower = (t.type || "").toString().toLowerCase();
      return INFLOW_TYPES.some(inflowType => typeLower.includes(inflowType.toLowerCase()));
    })
    .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  const totalOutflow = successfulTransactions
    .filter((t: any) => {
      const typeLower = (t.type || "").toString().toLowerCase();
      return OUTFLOW_TYPES.some(outflowType => typeLower.includes(outflowType.toLowerCase()));
    })
    .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  // ============================================
  // APP REVENUE CALCULATION - ONLY SUCCESSFUL FEES
  // ============================================
  
  // 1. Collect fees from ALL successful transactions
  const totalFeesFromColumn = successfulTransactions
    .reduce((s: number, t: any) => s + Number(t.fee ?? 0), 0);

  // 2. Collect deductions from ALL successful transactions
  const totalDeductions = successfulTransactions
    .reduce((s: number, t: any) => s + Number(t.total_deduction ?? 0), 0);

  // Debug fee information
  const transactionsWithFees = successfulTransactions.filter((t: any) => Number(t.fee ?? 0) > 0);
  if (transactionsWithFees.length > 0) {
    console.log("[/api/summary] Successful transactions with fees found:", transactionsWithFees.length);
  } else {
    console.log("[/api/summary] No successful transactions with fees found");
  }

  // Use whichever revenue source is available from SUCCESSFUL transactions
  let calculatedAppRevenue = 0;
  if (totalFeesFromColumn > 0) {
    calculatedAppRevenue = totalFeesFromColumn;
    console.log("[/api/summary] Using fee column from successful transactions for revenue:", totalFeesFromColumn);
  } else if (totalDeductions > 0) {
    calculatedAppRevenue = totalDeductions;
    console.log("[/api/summary] Using total_deduction from successful transactions for revenue:", totalDeductions);
  }

  // latestTransactions (last 5)
  const latestTransactions = transactions
    .slice(0, 5)
    .map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount ?? 0),
      fee: Number(t.fee ?? 0),
      total_deduction: Number(t.total_deduction ?? 0),
      status: t.status,
      created_at: t.created_at,
      description: t.description,
    }));

  // --- Users wallet balance ---
  const { data: usersBalancesData, error: ubError } = await supabaseAdmin
    .from("users")
    .select("wallet_balance");
  if (ubError)
    console.error("[/api/summary] users wallet fetch error:", ubError);
  const usersBalances = usersBalancesData || [];
  const mainWalletBalance = usersBalances.reduce(
    (s: number, u: any) => s + Number(u.wallet_balance ?? 0),
    0
  );

  // --- Users total count ---
  const { count: totalUsersCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });
  const totalUsers = Number(totalUsersCount ?? 0);

  // --- Contracts stats ---
  let contractsQuery = supabaseAdmin
    .from("contracts")
    .select("id, status, created_at");
  if (rangeDates) {
    contractsQuery = contractsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }
  const { data: contractsDataRaw, error: contractsError } =
    await contractsQuery;
  if (contractsError)
    console.error("[/api/summary] contracts fetch error:", contractsError);
  const contractsData = contractsDataRaw || [];
  const totalContractsIssued = contractsData.length;

  const pendingContracts = contractsData.filter(
    (c: any) => (c.status ?? "pending") === "pending"
  ).length;
  const signedContracts = contractsData.filter(
    (c: any) => (c.status ?? "").toLowerCase() === "signed"
  ).length;

  // monthlyContracts breakdown
  const monthLabels = buildMonthLabelsFromRange(rangeDates);
  const monthlyContractsMap: Record<string, number> = {};
  contractsData.forEach((c: any) => {
    const d = new Date(c.created_at);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthlyContractsMap[key] = (monthlyContractsMap[key] ?? 0) + 1;
  });
  const monthlyContracts = monthLabels.map((m) => ({
    month: m,
    count: monthlyContractsMap[m] ?? 0,
  }));

  // --- Invoices stats ---
  let invoicesQuery = supabaseAdmin
    .from("invoices")
    .select("id, status, created_at, paid_amount, total_amount, fee_amount, subtotal")
    .eq("status", "paid");
  
  if (rangeDates) {
    invoicesQuery = invoicesQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }
  
  const { data: invoicesDataRaw, error: invoicesError } =
    await invoicesQuery;
  if (invoicesError)
    console.error("[/api/summary] invoices fetch error:", invoicesError);
  
  const invoicesData = invoicesDataRaw || [];
  
  // Get total invoices count
  const { count: totalInvoicesCount } = await supabaseAdmin
    .from("invoices")
    .select("*", { count: "exact", head: true });
  const totalInvoicesIssued = Number(totalInvoicesCount ?? 0);
    
  const paidInvoices = invoicesData.length;
  const unpaidInvoices = totalInvoicesIssued - paidInvoices;
  
  // Invoice revenue (from paid invoices only)
  const totalInvoiceRevenue = invoicesData.reduce(
    (s: number, inv: any) => s + Number(inv.paid_amount ?? inv.total_amount ?? 0),
    0
  );
  
  // Invoice fees (from paid invoices only)
  const totalInvoiceFees = invoicesData.reduce(
    (s: number, inv: any) => s + Number(inv.fee_amount ?? 0),
    0
  );

  // --- Invoice Payments for platform fees ---
  let invoicePaymentsQuery = supabaseAdmin
    .from("invoice_payments")
    .select("amount, platform_fee, status, created_at")
    .eq("status", "completed");
    
  if (rangeDates) {
    invoicePaymentsQuery = invoicePaymentsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }
  
  const { data: invoicePaymentsRaw, error: ipError } = await invoicePaymentsQuery;
  if (ipError) console.error("[/api/summary] invoice payments error:", ipError);
  
  const invoicePayments = invoicePaymentsRaw || [];
  const totalPlatformFees = invoicePayments.reduce(
    (s: number, p: any) => s + Number(p.platform_fee ?? 0),
    0
  );

  // ============================================
  // COMBINE ALL REVENUE SOURCES
  // ============================================
  // All sources already filtered for successful/completed status

  // const combinedAppRevenue = calculatedAppRevenue + totalPlatformFees + totalInvoiceFees;
  const combinedAppRevenue = calculatedAppRevenue + totalPlatformFees;

  // monthlyInvoices breakdown
  const monthlyInvoicesMap: Record<
    string,
    { count: number; revenue: number }
  > = {};
  invoicesData.forEach((inv: any) => {
    const d = new Date(inv.created_at);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthlyInvoicesMap[key] = monthlyInvoicesMap[key] ?? {
      count: 0,
      revenue: 0,
    };
    monthlyInvoicesMap[key].count += 1;
    monthlyInvoicesMap[key].revenue += Number(inv.paid_amount ?? inv.total_amount ?? 0);
  });
  const monthlyInvoices = monthLabels.map((m) => ({
    month: m,
    count: monthlyInvoicesMap[m]?.count ?? 0,
    revenue: monthlyInvoicesMap[m]?.revenue ?? 0,
  }));

  // --- Monthly transactions breakdown (SUCCESSFUL ONLY) ---
  const monthlyTransactionsMap: Record<string, number> = {};
  successfulTransactions.forEach((t: any) => {
    const d = new Date(t.created_at);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthlyTransactionsMap[key] =
      (monthlyTransactionsMap[key] ?? 0) + Number(t.amount ?? 0);
  });
  const monthlyTransactions = monthLabels.map((m) => ({
    month: m,
    transactions: monthlyTransactionsMap[m] ?? 0,
  }));

  // ============================================
  // MONTHLY APP REVENUE BREAKDOWN
  // ONLY FEES FROM SUCCESSFUL TRANSACTIONS
  // ============================================
  const monthlyRevenueMap: Record<string, number> = {};
  
  // Add transaction fees from SUCCESSFUL transactions only
  successfulTransactions.forEach((t: any) => {
    const feeAmount = Number(t.fee ?? 0);
    if (feeAmount > 0) {
      const d = new Date(t.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] ?? 0) + feeAmount;
    }
  });
  
  // Add deductions from SUCCESSFUL transactions only
  successfulTransactions.forEach((t: any) => {
    const deductionAmount = Number(t.total_deduction ?? 0);
    if (deductionAmount > 0) {
      const d = new Date(t.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] ?? 0) + deductionAmount;
    }
  });
  
  // Add platform fees from COMPLETED invoice payments only
  invoicePayments.forEach((p: any) => {
    const platformFee = Number(p.platform_fee ?? 0);
    if (platformFee > 0) {
      const d = new Date(p.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] ?? 0) + platformFee;
    }
  });
  
  // Add invoice fees from PAID invoices only
  invoicesData.forEach((inv: any) => {
    const invoiceFee = Number(inv.fee_amount ?? 0);
    if (invoiceFee > 0) {
      const d = new Date(inv.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] ?? 0) + invoiceFee;
    }
  });
  
  const monthlyAppRevenue = monthLabels.map((m) => ({
    month: m,
    revenue: monthlyRevenueMap[m] ?? 0,
  }));

  // --- Nomba balance (cached) ---
  const nombaBalance = await fetchNombaBalanceCached(async () => {
    try {
      return await getNombaToken();
    } catch (err) {
      console.error("getNombaToken error:", err);
      return null;
    }
  });

  // --- Debug output ---
  console.log("=== FINANCIAL METRICS (SUCCESSFUL ONLY) ===");
  console.log("Total Transactions:", totalTransactions);
  console.log("Successful Transactions:", successfulTransactions.length);
  console.log("Failed Transactions:", failedTransactions.length);
  console.log("Pending Transactions:", pendingTransactions.length);
  console.log("Total Inflow (successful):", totalInflow);
  console.log("Total Outflow (successful):", totalOutflow);
  console.log("Main Wallet Balance:", mainWalletBalance);
  console.log("Transaction Fees (successful only):", totalFeesFromColumn);
  console.log("Total Deductions (successful only):", totalDeductions);
  console.log("Platform Fees (completed):", totalPlatformFees);
  console.log("Invoice Fees (paid):", totalInvoiceFees);
  console.log("Combined App Revenue (successful only):", combinedAppRevenue);
  console.log("Invoice Revenue (paid):", totalInvoiceRevenue);
  console.log("===========================================");

  // --- final response ---
  const response = {
    // Financial metrics (successful only)
    totalInflow,
    totalOutflow,
    mainWalletBalance,
    nombaBalance,
    
    // Transaction counts
    totalTransactions,
    totalUsers,
    
    // Invoice metrics
    pendingInvoices: unpaidInvoices,
    paidInvoices,
    totalInvoicesIssued,
    totalInvoiceRevenue,
    
    // Contract metrics
    pendingContracts,
    signedContracts,
    totalContractsIssued,
    
    // Transaction data
    latestTransactions,
    monthlyTransactions,
    monthlyInvoices,
    monthlyContracts,
    range: rangeParam,
    
    // App revenue metrics (SUCCESSFUL ONLY)
    totalAppRevenue: combinedAppRevenue,
    transactionFees: totalFeesFromColumn,
    platformFees: totalPlatformFees,
    invoiceFees: totalInvoiceFees,
    monthlyAppRevenue,
    
    // Transaction status breakdown
    transactionStatus: {
      success: successfulTransactions.length,
      failed: failedTransactions.length,
      pending: pendingTransactions.length,
    },
    
    // Include all transactions count by status
    successfulTransactions: successfulTransactions.length,
    failedTransactions: failedTransactions.length,
    pendingTransactions: pendingTransactions.length,
    _fromCache: false
  };

  // Cache the successful response
  summaryCache.set(cacheKey, {
    data: response,
    timestamp: Date.now()
  });

  console.log("[/api/summary] Response built successfully - ONLY SUCCESSFUL FEES INCLUDED");

  return response;
}

// Only export HTTP methods
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;
    
    const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin', 'support_admin', 'legal_admin'];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader.includes("sb-access-token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") ?? "total";
    const nocache = url.searchParams.get("nocache") === "true";

    // Clear cache if force refresh requested
    if (nocache) {
      clearSummaryCache(rangeParam);
      console.log(`🔄 Force refreshing summary data for range: ${rangeParam}`);
    }

    // USE CACHED SUMMARY DATA
    const response = await getCachedSummaryData(rangeParam);

    // Remove cache flag from final response
    const { _fromCache, ...cleanResponse } = response;

    return NextResponse.json({
      ...cleanResponse,
      _cache: {
        cached: _fromCache,
        timestamp: Date.now(),
        range: rangeParam
      }
    });
  } catch (err) {
    console.error("[/api/summary] Unhandled error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
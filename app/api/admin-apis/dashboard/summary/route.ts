import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const summaryCache = new Map();
const SUMMARY_CACHE_TTL = 1 * 60 * 1000;

let _cachedNomba = { ts: 0, value: 0 };
const NOMBA_CACHE_TTL = 60 * 1000;

async function fetchNombaBalanceCached(
  getTokenFn: () => Promise<string | null>
): Promise<number> {
  try {
    const now = Date.now();
    if (now - _cachedNomba.ts < NOMBA_CACHE_TTL) {
      return _cachedNomba.value;
    }

    const token = await getTokenFn();
    if (!token) {
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
      return 0;
    }

    const data = await res.json().catch(() => ({}));
    const amount = Number(data?.data?.amount ?? 0);
    _cachedNomba = { ts: now, value: amount };
    return amount;
  } catch (err) {
    return 0;
  }
}

function parseRangeToDates(
  range: string | null
): { start: string; end: string } | null {
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

function clearSummaryCache(range?: string): boolean | number {
  if (range) {
    const cacheKey = `summary_${range}`;
    const existed = summaryCache.delete(cacheKey);
    return existed;
  } else {
    const count = summaryCache.size;
    summaryCache.clear();
    return count;
  }
}

async function getCachedSummaryData(rangeParam: string): Promise<any> {
  const cacheKey = `summary_${rangeParam}`;
  const cached = summaryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < SUMMARY_CACHE_TTL) {
    return {
      ...cached.data,
      _fromCache: true,
    };
  }

  const rangeDates = parseRangeToDates(rangeParam);

  let txQuery = supabaseAdmin
    .from("transactions")
    .select(
      "id, amount, type, status, created_at, description, fee, total_deduction"
    )
    .order("created_at", { ascending: false });

  if (rangeDates) {
    txQuery = txQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: transactionsData, error: txError } = await txQuery;
  const transactions = transactionsData || [];

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
    "transfer",
  ];

  const OUTFLOW_TYPES = [
    "withdrawal",
    "transfer",
    "p2p_transfer",
    "airtime",
    "data",
    "electricity",
    "cable",
    "debit",
    "invoice_creation",
    "invoice",
    "contract",
    "fee",
  ];

  const totalTransactions = transactions.length;

  const successfulTransactions = transactions.filter(
    (t: any) => t.status === "success"
  );
  const failedTransactions = transactions.filter(
    (t: any) => t.status === "failed"
  );
  const pendingTransactions = transactions.filter(
    (t: any) => t.status === "pending"
  );

  const totalInflow = successfulTransactions
    .filter((t: any) => {
      const typeLower = (t.type || "").toString().toLowerCase();
      return INFLOW_TYPES.some((inflowType) =>
        typeLower.includes(inflowType.toLowerCase())
      );
    })
    .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  const totalOutflow = successfulTransactions
    .filter((t: any) => {
      const typeLower = (t.type || "").toString().toLowerCase();
      return OUTFLOW_TYPES.some((outflowType) =>
        typeLower.includes(outflowType.toLowerCase())
      );
    })
    .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  const totalFeesFromColumn = successfulTransactions.reduce(
    (s: number, t: any) => {
      const fee = Number(t.fee ?? 0);
      return s + (isNaN(fee) ? 0 : fee);
    },
    0
  );

  const totalDeductions = successfulTransactions.reduce((s: number, t: any) => {
    const deduction = Number(t.total_deduction ?? 0);
    return s + (isNaN(deduction) ? 0 : deduction);
  }, 0);

  const latestTransactions = transactions.slice(0, 5).map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount ?? 0),
    fee: Number(t.fee ?? 0),
    total_deduction: Number(t.total_deduction ?? 0),
    status: t.status,
    created_at: t.created_at,
    description: t.description,
  }));

  const { data: usersBalancesData } = await supabaseAdmin
    .from("users")
    .select("wallet_balance");
  const usersBalances = usersBalancesData || [];
  const mainWalletBalance = usersBalances.reduce(
    (s: number, u: any) => s + Number(u.wallet_balance ?? 0),
    0
  );

  const { count: totalUsersCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });
  const totalUsers = Number(totalUsersCount ?? 0);

  let contractsQuery = supabaseAdmin
    .from("contracts")
    .select("id, status, created_at");
  if (rangeDates) {
    contractsQuery = contractsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }
  const { data: contractsDataRaw } = await contractsQuery;
  const contractsData = contractsDataRaw || [];
  const totalContractsIssued = contractsData.length;

  const pendingContracts = contractsData.filter(
    (c: any) => (c.status ?? "pending") === "pending"
  ).length;
  const signedContracts = contractsData.filter(
    (c: any) => (c.status ?? "").toLowerCase() === "signed"
  ).length;

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

  let invoicesQuery = supabaseAdmin
    .from("invoices")
    .select(
      "id, status, created_at, paid_amount, total_amount, fee_amount, subtotal"
    )
    .eq("status", "paid");

  if (rangeDates) {
    invoicesQuery = invoicesQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: invoicesDataRaw } = await invoicesQuery;
  const invoicesData = invoicesDataRaw || [];

  const { count: totalInvoicesCount } = await supabaseAdmin
    .from("invoices")
    .select("*", { count: "exact", head: true });
  const totalInvoicesIssued = Number(totalInvoicesCount ?? 0);

  const paidInvoices = invoicesData.length;
  const unpaidInvoices = totalInvoicesIssued - paidInvoices;

  const totalInvoiceRevenue = invoicesData.reduce(
    (s: number, inv: any) =>
      s + Number(inv.paid_amount ?? inv.total_amount ?? 0),
    0
  );

  const totalInvoiceFees = invoicesData.reduce(
    (s: number, inv: any) => s + Number(inv.fee_amount ?? 0),
    0
  );

  let invoicePaymentsQuery = supabaseAdmin
    .from("invoice_payments")
    .select("amount, platform_fee, status, created_at")
    .eq("status", "completed");

  if (rangeDates) {
    invoicePaymentsQuery = invoicePaymentsQuery
      .gte("created_at", rangeDates.start)
      .lte("created_at", rangeDates.end);
  }

  const { data: invoicePaymentsRaw } = await invoicePaymentsQuery;
  const invoicePayments = invoicePaymentsRaw || [];
  const totalPlatformFees = invoicePayments.reduce(
    (s: number, p: any) => s + Number(p.platform_fee ?? 0),
    0
  );

  const combinedAppRevenue = totalFeesFromColumn + totalPlatformFees;

  const monthlyInvoicesMap: Record<string, { count: number; revenue: number }> =
    {};
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
    monthlyInvoicesMap[key].revenue += Number(
      inv.paid_amount ?? inv.total_amount ?? 0
    );
  });
  const monthlyInvoices = monthLabels.map((m) => ({
    month: m,
    count: monthlyInvoicesMap[m]?.count ?? 0,
    revenue: monthlyInvoicesMap[m]?.revenue ?? 0,
  }));

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

  const monthlyRevenueMap: Record<string, number> = {};

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

  const nombaBalance = await fetchNombaBalanceCached(async () => {
    try {
      return await getNombaToken();
    } catch (err) {
      return null;
    }
  });

  const response = {
    totalInflow,
    totalOutflow,
    mainWalletBalance,
    nombaBalance,
    totalTransactions,
    totalUsers,
    pendingInvoices: unpaidInvoices,
    paidInvoices,
    totalInvoicesIssued,
    totalInvoiceRevenue,
    pendingContracts,
    signedContracts,
    totalContractsIssued,
    latestTransactions,
    monthlyTransactions,
    monthlyInvoices,
    monthlyContracts,
    range: rangeParam,
    totalAppRevenue: combinedAppRevenue,
    transactionFees: totalFeesFromColumn,
    platformFees: totalPlatformFees,
    invoiceFees: totalInvoiceFees,
    monthlyAppRevenue,
    transactionStatus: {
      success: successfulTransactions.length,
      failed: failedTransactions.length,
      pending: pendingTransactions.length,
    },
    successfulTransactions: successfulTransactions.length,
    failedTransactions: failedTransactions.length,
    pendingTransactions: pendingTransactions.length,
    _fromCache: false,
  };

  summaryCache.set(cacheKey, {
    data: response,
    timestamp: Date.now(),
  });

  return response;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = [
      "super_admin",
      "operations_admin",
      "finance_admin",
      "support_admin",
      "legal_admin",
    ];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader.includes("sb-access-token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") ?? "total";
    const nocache = url.searchParams.get("nocache") === "true";

    if (nocache) {
      clearSummaryCache(rangeParam);
    }

    const response = await getCachedSummaryData(rangeParam);
    const { _fromCache, ...cleanResponse } = response;

    return NextResponse.json({
      ...cleanResponse,
      _cache: {
        cached: _fromCache,
        timestamp: Date.now(),
        range: rangeParam,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
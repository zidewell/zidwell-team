import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RangeOption = "total" | "today" | "week" | "month" | "90days" | "180days" | "year" | "custom";

const parseRangeToDates = (range: RangeOption, customFrom?: Date, customTo?: Date) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (range === "custom" && customFrom && customTo) {
    return { start: customFrom, end: customTo };
  }

  if (range === "total") {
    // For "total" range, return a very old start date (e.g., 5 years ago)
    // This ensures we get all historical data
    start = new Date();
    start.setFullYear(now.getFullYear() - 5); // 5 years ago
    return { start, end };
  }

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { start, end };
};

export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const url = new URL(req.url);
    const range = url.searchParams.get("range") as RangeOption || "total";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const customFrom = from ? new Date(from) : undefined;
    const customTo = to ? new Date(to) : undefined;
    const dateRange = parseRangeToDates(range, customFrom, customTo);

    // Fetch total users count (always needed)
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // Fetch user signups for the selected range
    let userSignupsQuery = supabaseAdmin
      .from("users")
      .select("created_at");

    if (range !== "total") {
      userSignupsQuery = userSignupsQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: rangeUsers } = await userSignupsQuery;

    // Calculate signups for different periods (these work independently of main range)
    const todaySignups = await getSignupsCountForPeriod("today");
    const weekSignups = await getSignupsCountForPeriod("week");
    const monthSignups = await getSignupsCountForPeriod("month");
    const days90Signups = await getSignupsCountForPeriod("90days");
    const days180Signups = await getSignupsCountForPeriod("180days");
    const yearSignups = await getSignupsCountForPeriod("year");

    // Process daily signups data
    const dailySignups = rangeUsers || [];
    const signupsByDay = processDailyData(dailySignups, "created_at");

    const signupsData = {
      today: todaySignups || 0,
      week: weekSignups || 0,
      month: monthSignups || 0,
      "90days": days90Signups || 0,
      "180days": days180Signups || 0,
      year: yearSignups || 0,
      total: totalUsers || 0,
      daily: signupsByDay,
      weekly: processWeeklyData(signupsByDay),
      monthly: processMonthlyData(signupsByDay),
    };

    // Fetch active users for the selected range
    let activeUsersQuery = supabaseAdmin
      .from("transactions")
      .select("user_id, created_at")
      .eq("status", "success");

    if (range !== "total") {
      activeUsersQuery = activeUsersQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: activeUsersData } = await activeUsersQuery;
    
    // Get unique active users for the range
    const uniqueActiveUsers = new Set(activeUsersData?.map(tx => tx.user_id) || []);
    const activeUsersCount = uniqueActiveUsers.size;

    // Get active users counts for all periods
    const todayActiveUsers = await getActiveUsersCountForPeriod("today");
    const weekActiveUsers = await getActiveUsersCountForPeriod("week");
    const monthActiveUsers = await getActiveUsersCountForPeriod("month");
    const days90ActiveUsers = await getActiveUsersCountForPeriod("90days");
    const days180ActiveUsers = await getActiveUsersCountForPeriod("180days");
    const yearActiveUsers = await getActiveUsersCountForPeriod("year");

    // Get total active users (all time)
    const { data: allActiveUsersData } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("status", "success");
    const totalActiveUsers = new Set(allActiveUsersData?.map(tx => tx.user_id) || []).size;

    // Process daily active users data
    const dailyActiveUsers = processDailyActiveUsers(activeUsersData || []);

    const activeUsersDataResponse = {
      today: todayActiveUsers,
      week: weekActiveUsers,
      month: monthActiveUsers,
      "90days": days90ActiveUsers,
      "180days": days180ActiveUsers,
      year: yearActiveUsers,
      total: range === "total" ? totalActiveUsers : activeUsersCount,
      daily: dailyActiveUsers,
      weekly: processWeeklyData(dailyActiveUsers.map(d => ({ ...d, count: d.active_users }))),
      monthly: processMonthlyData(dailyActiveUsers.map(d => ({ ...d, count: d.active_users }))),
    };

    // Fetch transaction volume for the selected range
    let transactionVolumeQuery = supabaseAdmin
      .from("transactions")
      .select("amount, created_at, status");

    if (range !== "total") {
      transactionVolumeQuery = transactionVolumeQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: rangeTransactions } = await transactionVolumeQuery;

    const successfulTransactions = rangeTransactions?.filter(tx => tx.status === "success") || [];
    const totalVolume = successfulTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    
    // Get volume for different periods
    const todayVolume = await getTransactionVolumeForPeriod("today");
    const weekVolume = await getTransactionVolumeForPeriod("week");
    const monthVolume = await getTransactionVolumeForPeriod("month");
    const days90Volume = await getTransactionVolumeForPeriod("90days");
    const days180Volume = await getTransactionVolumeForPeriod("180days");
    const yearVolume = await getTransactionVolumeForPeriod("year");

    // Get all-time total volume
    const { data: allTransactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, status")
      .eq("status", "success");
    const allTimeVolume = allTransactions?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;

    // Process daily transaction data
    const dailyTransactionData = processDailyTransactionData(successfulTransactions);

    const transactionVolumeData = {
      today: todayVolume,
      week: weekVolume,
      month: monthVolume,
      "90days": days90Volume,
      "180days": days180Volume,
      year: yearVolume,
      total: range === "total" ? allTimeVolume : totalVolume,
      daily: dailyTransactionData,
      weekly: processWeeklyVolumeData(dailyTransactionData),
      monthly: processMonthlyVolumeData(dailyTransactionData),
    };

    // *** REVENUE CALCULATION ***
    // For the selected range
    let feeTransactionsQuery = supabaseAdmin
      .from("transactions")
      .select("fee, created_at, status");

    if (range !== "total") {
      feeTransactionsQuery = feeTransactionsQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: rangeFeeTransactions } = await feeTransactionsQuery;

    const transactionFees = rangeFeeTransactions
      ?.filter(tx => tx.status === "success")
      ?.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0) || 0;

    // Fetch invoice fees for the range
    let paidInvoicesQuery = supabaseAdmin
      .from("invoices")
      .select("fee_amount, created_at, status");

    if (range !== "total") {
      paidInvoicesQuery = paidInvoicesQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: rangePaidInvoices } = await paidInvoicesQuery
      .eq("status", "paid");

    const invoiceFees = rangePaidInvoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

    // Fetch platform fees for the range
    let invoicePaymentsQuery = supabaseAdmin
      .from("invoice_payments")
      .select("platform_fee, created_at, status");

    if (range !== "total") {
      invoicePaymentsQuery = invoicePaymentsQuery
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    const { data: rangeInvoicePayments } = await invoicePaymentsQuery
      .eq("status", "completed");

    const platformFees = rangeInvoicePayments?.reduce((sum, payment) => sum + (Number(payment.platform_fee) || 0), 0) || 0;

    // Total revenue for the range
    const totalRevenue = transactionFees + invoiceFees + platformFees;

    // Get all-time total revenue
    const allTimeRevenue = await getRevenueForPeriod("total");
    const todayRevenue = await getRevenueForPeriod("today");
    const weekRevenue = await getRevenueForPeriod("week");
    const monthRevenue = await getRevenueForPeriod("month");
    const days90Revenue = await getRevenueForPeriod("90days");
    const days180Revenue = await getRevenueForPeriod("180days");
    const yearRevenue = await getRevenueForPeriod("year");

    // Get revenue breakdown for all periods
    const totalRevenueBreakdown = await getRevenueBreakdownForPeriod("total");
    const todayRevenueBreakdown = await getRevenueBreakdownForPeriod("today");
    const weekRevenueBreakdown = await getRevenueBreakdownForPeriod("week");
    const monthRevenueBreakdown = await getRevenueBreakdownForPeriod("month");
    const days90RevenueBreakdown = await getRevenueBreakdownForPeriod("90days");
    const days180RevenueBreakdown = await getRevenueBreakdownForPeriod("180days");
    const yearRevenueBreakdown = await getRevenueBreakdownForPeriod("year");

    // Get daily revenue data for the range
    const dailyRevenueData = await getDailyRevenueData(dateRange.start, dateRange.end);

    const revenueData = {
      total: totalRevenueBreakdown,
      today: todayRevenueBreakdown,
      week: weekRevenueBreakdown,
      month: monthRevenueBreakdown,
      "90days": days90RevenueBreakdown,
      "180days": days180RevenueBreakdown,
      year: yearRevenueBreakdown,
      daily: dailyRevenueData,
      weekly: processWeeklyRevenueData(dailyRevenueData),
      monthly: processMonthlyRevenueData(dailyRevenueData)
    };

    // Website data (using signups as proxy for now - you might want to track actual website visits separately)
    const response = {
      website: {
        ...signupsData,
        total: totalUsers || 0
      },
      signups: signupsData,
      active_users: activeUsersDataResponse,
      transaction_volume: transactionVolumeData,
      revenue_breakdown: revenueData,
      range,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

// Helper function to get signups count for a period
async function getSignupsCountForPeriod(period: string): Promise<number> {
  if (period === "total") {
    const { count } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });
    return count || 0;
  }

  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  const { count } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  return count || 0;
}

// Helper function to get active users count for a period
async function getActiveUsersCountForPeriod(period: string): Promise<number> {
  if (period === "total") {
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("status", "success");
    
    const uniqueUsers = new Set(data?.map(tx => tx.user_id) || []);
    return uniqueUsers.size;
  }

  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  const { data } = await supabaseAdmin
    .from("transactions")
    .select("user_id")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const uniqueUsers = new Set(data?.map(tx => tx.user_id) || []);
  return uniqueUsers.size;
}

// Helper function to get transaction volume for a period
async function getTransactionVolumeForPeriod(period: string): Promise<number> {
  if (period === "total") {
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("amount, status")
      .eq("status", "success");
    
    return data?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;
  }

  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  const { data } = await supabaseAdmin
    .from("transactions")
    .select("amount, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  return data?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;
}

// Get revenue for a period
async function getRevenueForPeriod(period: string): Promise<number> {
  if (period === "total") {
    // Get all transaction fees
    const { data: allTransactions } = await supabaseAdmin
      .from("transactions")
      .select("fee, status")
      .eq("status", "success");
    
    const transactionFees = allTransactions?.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0) || 0;

    // Get all invoice fees
    const { data: allInvoices } = await supabaseAdmin
      .from("invoices")
      .select("fee_amount, status")
      .eq("status", "paid");
    
    const invoiceFees = allInvoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

    // Get all platform fees
    const { data: allInvoicePayments } = await supabaseAdmin
      .from("invoice_payments")
      .select("platform_fee, status")
      .eq("status", "completed");
    
    const platformFees = allInvoicePayments?.reduce((sum, payment) => sum + (Number(payment.platform_fee) || 0), 0) || 0;

    return transactionFees + invoiceFees + platformFees;
  }

  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Get transaction fees
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("fee, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const transactionFees = transactions?.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0) || 0;

  // Get invoice fees
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("fee_amount, status")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const invoiceFees = invoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

  // Get platform fees
  const { data: invoicePayments } = await supabaseAdmin
    .from("invoice_payments")
    .select("platform_fee, status")
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const platformFees = invoicePayments?.reduce((sum, payment) => sum + (Number(payment.platform_fee) || 0), 0) || 0;

  return transactionFees + invoiceFees + platformFees;
}

// Get revenue breakdown for a period
async function getRevenueBreakdownForPeriod(period: string): Promise<any> {
  if (period === "total") {
    // Get all transaction fees
    const { data: allTransactions } = await supabaseAdmin
      .from("transactions")
      .select("fee, status")
      .eq("status", "success");
    
    const transactionFees = allTransactions?.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0) || 0;

    // Get all invoice fees
    const { data: allInvoices } = await supabaseAdmin
      .from("invoices")
      .select("fee_amount, status")
      .eq("status", "paid");
    
    const invoiceFees = allInvoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

    // Get all platform fees
    const { data: allInvoicePayments } = await supabaseAdmin
      .from("invoice_payments")
      .select("platform_fee, status")
      .eq("status", "completed");
    
    const platformFees = allInvoicePayments?.reduce((sum, payment) => sum + (Number(payment.platform_fee) || 0), 0) || 0;

    const total = transactionFees + invoiceFees + platformFees;

    return {
      total,
      transfers: transactionFees,
      bill_payment: 0,
      invoice: invoiceFees,
      contract: 0,
      platform: platformFees
    };
  }

  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "90days":
      start.setDate(now.getDate() - 90);
      break;
    case "180days":
      start.setDate(now.getDate() - 180);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Get transaction fees (transfers)
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("fee, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const transactionFees = transactions?.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0) || 0;

  // Get invoice fees
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("fee_amount, status")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const invoiceFees = invoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

  // Get platform fees
  const { data: invoicePayments } = await supabaseAdmin
    .from("invoice_payments")
    .select("platform_fee, status")
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const platformFees = invoicePayments?.reduce((sum, payment) => sum + (Number(payment.platform_fee) || 0), 0) || 0;

  const total = transactionFees + invoiceFees + platformFees;

  return {
    total,
    transfers: transactionFees,
    bill_payment: 0,
    invoice: invoiceFees,
    contract: 0,
    platform: platformFees
  };
}

// Get daily revenue data
async function getDailyRevenueData(start: Date, end: Date): Promise<any[]> {
  // Get transaction fees by day
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("fee, created_at, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  // Get invoice fees by day
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("fee_amount, created_at, status")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  // Get platform fees by day
  const { data: invoicePayments } = await supabaseAdmin
    .from("invoice_payments")
    .select("platform_fee, created_at, status")
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  return processDailyRevenueData(
    transactions || [],
    invoices || [],
    invoicePayments || []
  );
}

// Data processing functions
function processDailyData(data: any[], dateField: string): any[] {
  const dailyMap: { [key: string]: number } = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    dailyMap[date] = (dailyMap[date] || 0) + 1;
  });

  return Object.entries(dailyMap).map(([date, count]) => ({
    date,
    count
  }));
}

function processDailyActiveUsers(transactions: any[]): any[] {
  const dailyMap: { [key: string]: Set<string> } = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = new Set();
    }
    dailyMap[date].add(tx.user_id);
  });

  return Object.entries(dailyMap).map(([date, userSet]) => ({
    date,
    active_users: userSet.size
  }));
}

function processDailyTransactionData(transactions: any[]): any[] {
  const dailyMap: { [key: string]: number } = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    dailyMap[date] = (dailyMap[date] || 0) + (Number(tx.amount) || 0);
  });

  return Object.entries(dailyMap).map(([date, amount]) => ({
    date,
    amount
  }));
}

// Process daily revenue data
function processDailyRevenueData(transactions: any[], invoices: any[], invoicePayments: any[]): any[] {
  const dailyMap: { [key: string]: { transfers: number; invoice: number; platform: number; total: number } } = {};
  
  // Process transaction fees (transfers)
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { transfers: 0, invoice: 0, platform: 0, total: 0 };
    }
    const fee = Number(tx.fee) || 0;
    dailyMap[date].transfers += fee;
    dailyMap[date].total += fee;
  });

  // Process invoice fees
  invoices.forEach(inv => {
    const date = new Date(inv.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { transfers: 0, invoice: 0, platform: 0, total: 0 };
    }
    const fee = Number(inv.fee_amount) || 0;
    dailyMap[date].invoice += fee;
    dailyMap[date].total += fee;
  });

  // Process platform fees
  invoicePayments.forEach(payment => {
    const date = new Date(payment.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { transfers: 0, invoice: 0, platform: 0, total: 0 };
    }
    const fee = Number(payment.platform_fee) || 0;
    dailyMap[date].platform += fee;
    dailyMap[date].total += fee;
  });

  return Object.entries(dailyMap).map(([date, amounts]) => ({
    date,
    total: amounts.total,
    transfers: amounts.transfers,
    invoice: amounts.invoice,
    bill_payment: 0,
    contract: 0,
    platform: amounts.platform
  }));
}

function processWeeklyData(dailyData: any[]): any[] {
  const weeklyData: any[] = [];
  let currentWeek: any = null;
  let weekCount = 0;
  let weekStart = "";

  dailyData.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1 || currentWeek === null) {
      if (currentWeek !== null) {
        const weekEnd = new Date(day.date);
        weekEnd.setDate(weekEnd.getDate() - 1);
        weeklyData.push({
          week: `${weekStart} - ${weekEnd.toISOString().split('T')[0]}`,
          count: weekCount
        });
      }
      currentWeek = { date: day.date, count: 0 };
      weekStart = day.date;
      weekCount = day.count;
    } else {
      weekCount += day.count;
    }
  });

  if (currentWeek !== null) {
    const weekEnd = dailyData[dailyData.length - 1]?.date || currentWeek.date;
    weeklyData.push({
      week: `${weekStart} - ${weekEnd}`,
      count: weekCount
    });
  }

  return weeklyData;
}

function processMonthlyData(dailyData: any[]): any[] {
  const monthlyMap: { [key: string]: number } = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + day.count;
  });

  return Object.entries(monthlyMap).map(([month, count]) => ({
    month,
    count
  }));
}

function processWeeklyVolumeData(dailyData: any[]): any[] {
  return processWeeklyData(dailyData.map(d => ({ ...d, count: d.amount })));
}

function processMonthlyVolumeData(dailyData: any[]): any[] {
  return processMonthlyData(dailyData.map(d => ({ ...d, count: d.amount })));
}

// Process weekly revenue data
function processWeeklyRevenueData(dailyData: any[]): any[] {
  const weeklyData: any[] = [];
  let currentWeek: any = null;
  let weekTotals: any = { transfers: 0, invoice: 0, platform: 0, total: 0 };
  let weekStart = "";

  dailyData.forEach((day) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1 || currentWeek === null) {
      if (currentWeek !== null) {
        const weekEnd = new Date(day.date);
        weekEnd.setDate(weekEnd.getDate() - 1);
        weeklyData.push({
          week: `${weekStart} - ${weekEnd.toISOString().split('T')[0]}`,
          ...weekTotals,
          bill_payment: 0,
          contract: 0
        });
      }
      currentWeek = day;
      weekStart = day.date;
      weekTotals = { 
        transfers: day.transfers, 
        invoice: day.invoice, 
        platform: day.platform || 0,
        total: day.total 
      };
    } else {
      weekTotals.transfers += day.transfers;
      weekTotals.invoice += day.invoice;
      weekTotals.platform += day.platform || 0;
      weekTotals.total += day.total;
    }
  });

  if (currentWeek !== null) {
    const weekEnd = dailyData[dailyData.length - 1]?.date || currentWeek.date;
    weeklyData.push({
      week: `${weekStart} - ${weekEnd}`,
      ...weekTotals,
      bill_payment: 0,
      contract: 0
    });
  }

  return weeklyData;
}

// Process monthly revenue data
function processMonthlyRevenueData(dailyData: any[]): any[] {
  const monthlyMap: { [key: string]: any } = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { transfers: 0, invoice: 0, platform: 0, total: 0 };
    }
    
    monthlyMap[monthKey].transfers += day.transfers;
    monthlyMap[monthKey].invoice += day.invoice;
    monthlyMap[monthKey].platform += day.platform || 0;
    monthlyMap[monthKey].total += day.total;
  });

  return Object.entries(monthlyMap).map(([month, amounts]) => ({
    month,
    ...amounts,
    bill_payment: 0,
    contract: 0
  }));
}
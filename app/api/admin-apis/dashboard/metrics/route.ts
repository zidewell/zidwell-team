import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RangeOption = "today" | "week" | "month" | "90days" | "180days" | "year";

const parseRangeToDates = (range: RangeOption, customFrom?: Date, customTo?: Date) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (range === "custom" && customFrom && customTo) {
    return { start: customFrom, end: customTo };
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
    const range = url.searchParams.get("range") as RangeOption || "month";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const customFrom = from ? new Date(from) : undefined;
    const customTo = to ? new Date(to) : undefined;
    const dateRange = parseRangeToDates(range, customFrom, customTo);

    // Fetch user signups with real data
    const { count: todaySignups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Fetch weekly signups
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const { count: weekSignups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString());

    // Fetch monthly signups
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const { count: monthSignups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString());

    // Fetch 90 days signups
    const days90Start = new Date();
    days90Start.setDate(days90Start.getDate() - 90);
    const { count: days90Signups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", days90Start.toISOString());

    // Fetch 180 days signups
    const days180Start = new Date();
    days180Start.setDate(days180Start.getDate() - 180);
    const { count: days180Signups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", days180Start.toISOString());

    // Fetch yearly signups
    const yearStart = new Date();
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    const { count: yearSignups } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yearStart.toISOString());

    // Fetch all users count
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // Fetch daily signups data for chart
    const { data: dailySignups } = await supabaseAdmin
      .from("users")
      .select("created_at")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString())
      .order("created_at");

    // Process daily signups for chart
    const signupsByDay = processDailyData(dailySignups || [], "created_at");

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

    // Fetch active users (users with transactions in period)
    const { data: activeUsersQuery } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("status", "success")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const uniqueActiveUsers = new Set(activeUsersQuery?.map(tx => tx.user_id) || []);
    const activeUsersCount = uniqueActiveUsers.size;

    // Fetch active users for different time periods
    const todayActiveUsers = await getActiveUsersCount("today");
    const weekActiveUsers = await getActiveUsersCount("week");
    const monthActiveUsers = await getActiveUsersCount("month");
    const days90ActiveUsers = await getActiveUsersCount("90days");
    const days180ActiveUsers = await getActiveUsersCount("180days");
    const yearActiveUsers = await getActiveUsersCount("year");

    // Fetch daily active users data
    const { data: dailyTransactions } = await supabaseAdmin
      .from("transactions")
      .select("user_id, created_at")
      .eq("status", "success")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const dailyActiveUsers = processDailyActiveUsers(dailyTransactions || []);

    const activeUsersData = {
      today: todayActiveUsers,
      week: weekActiveUsers,
      month: monthActiveUsers,
      "90days": days90ActiveUsers,
      "180days": days180ActiveUsers,
      year: yearActiveUsers,
      total: activeUsersCount,
      daily: dailyActiveUsers,
      weekly: processWeeklyData(dailyActiveUsers.map(d => ({ ...d, count: d.active_users }))),
      monthly: processMonthlyData(dailyActiveUsers.map(d => ({ ...d, count: d.active_users }))),
    };

    // Fetch transaction volume with real data
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, created_at, type, status")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Calculate total volume for successful transactions only
    const successfulTransactions = transactions?.filter(tx => tx.status === "success") || [];
    const totalVolume = successfulTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    
    // Fetch transaction volumes for different periods
    const todayVolume = await getTransactionVolume("today");
    const weekVolume = await getTransactionVolume("week");
    const monthVolume = await getTransactionVolume("month");
    const days90Volume = await getTransactionVolume("90days");
    const days180Volume = await getTransactionVolume("180days");
    const yearVolume = await getTransactionVolume("year");

    // Fetch daily transaction volume data
    const dailyTransactionData = await getDailyTransactionVolume(dateRange.start, dateRange.end);

    const transactionVolumeData = {
      today: todayVolume,
      week: weekVolume,
      month: monthVolume,
      "90days": days90Volume,
      "180days": days180Volume,
      year: yearVolume,
      total: totalVolume,
      daily: dailyTransactionData,
      weekly: processWeeklyVolumeData(dailyTransactionData),
      monthly: processMonthlyVolumeData(dailyTransactionData),
    };

    // Fetch revenue data from invoices and transactions
    const { data: paidInvoices } = await supabaseAdmin
      .from("invoices")
      .select("paid_amount, fee_amount, created_at, status")
      .eq("status", "paid")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Calculate invoice revenue
    const invoiceRevenue = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0) || 0;
    const invoiceFees = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

    // Fetch transaction fees (from successful transactions with fees)
    const { data: feeTransactions } = await supabaseAdmin
      .from("transactions")
      .select("fee, total_deduction, created_at, status")
      .eq("status", "success")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const transactionFees = feeTransactions?.reduce((sum, tx) => {
      const fee = Number(tx.fee) || 0;
      const deduction = Number(tx.total_deduction) || 0;
      return sum + fee + deduction;
    }, 0) || 0;

    const totalRevenue = invoiceRevenue + transactionFees;

    // Get revenue breakdown by time periods
    const todayRevenue = await getRevenueForPeriod("today");
    const weekRevenue = await getRevenueForPeriod("week");
    const monthRevenue = await getRevenueForPeriod("month");
    const days90Revenue = await getRevenueForPeriod("90days");
    const days180Revenue = await getRevenueForPeriod("180days");
    const yearRevenue = await getRevenueForPeriod("year");

    // Get daily revenue breakdown
    const dailyRevenueData = await getDailyRevenueData(dateRange.start, dateRange.end);

    const revenueData = {
      today: todayRevenue,
      week: weekRevenue,
      month: monthRevenue,
      "90days": days90Revenue,
      "180days": days180Revenue,
      year: yearRevenue,
      total: totalRevenue,
      daily: dailyRevenueData,
      weekly: processWeeklyRevenueData(dailyRevenueData),
      monthly: processMonthlyRevenueData(dailyRevenueData),
      breakdown: {
        transfers: transactionFees, // Assuming most transaction fees are from transfers
        bill_payment: 0, // N/A for now
        invoice: invoiceFees,
        contract: 0, // N/A
        taxfiling: 0, // N/A
        receipt: 0 // N/A
      },
    };

    const response: any = {
      website: {
        // For now, using signups as proxy for website traffic
        ...signupsData,
        total: totalUsers || 0
      },
      signups: signupsData,
      active_users: activeUsersData,
      transaction_volume: transactionVolumeData,
      revenue: revenueData,
      range,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

// Helper function to get active users count for a period
async function getActiveUsersCount(period: string): Promise<number> {
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
async function getTransactionVolume(period: string): Promise<number> {
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

// Helper function to get daily transaction volume
async function getDailyTransactionVolume(start: Date, end: Date): Promise<any[]> {
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("amount, created_at, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  return processDailyTransactionData(data || []);
}

// Helper function to get revenue for a period
async function getRevenueForPeriod(period: string): Promise<number> {
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

  // Get invoice fees
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("fee_amount, status")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const invoiceFees = invoices?.reduce((sum, inv) => sum + (Number(inv.fee_amount) || 0), 0) || 0;

  // Get transaction fees
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("fee, total_deduction, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  const transactionFees = transactions?.reduce((sum, tx) => {
    const fee = Number(tx.fee) || 0;
    const deduction = Number(tx.total_deduction) || 0;
    return sum + fee + deduction;
  }, 0) || 0;

  return invoiceFees + transactionFees;
}

// Helper function to get daily revenue data
async function getDailyRevenueData(start: Date, end: Date): Promise<any[]> {
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("fee_amount, created_at, status")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("fee, total_deduction, created_at, status")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at");

  return processDailyRevenueData(invoices || [], transactions || []);
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

function processDailyRevenueData(invoices: any[], transactions: any[]): any[] {
  const dailyMap: { [key: string]: { transfers: number; invoice: number; total: number } } = {};
  
  // Process invoices
  invoices.forEach(inv => {
    const date = new Date(inv.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { transfers: 0, invoice: 0, total: 0 };
    }
    const fee = Number(inv.fee_amount) || 0;
    dailyMap[date].invoice += fee;
    dailyMap[date].total += fee;
  });

  // Process transactions (assuming most fees are from transfers)
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { transfers: 0, invoice: 0, total: 0 };
    }
    const fee = Number(tx.fee) || 0;
    const deduction = Number(tx.total_deduction) || 0;
    const totalFee = fee + deduction;
    dailyMap[date].transfers += totalFee;
    dailyMap[date].total += totalFee;
  });

  return Object.entries(dailyMap).map(([date, amounts]) => ({
    date,
    ...amounts,
    bill_payment: 0, // N/A
    contract: 0, // N/A
    taxfiling: 0, // N/A
    receipt: 0 // N/A
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
    
    if (dayOfWeek === 1 || currentWeek === null) { // Monday
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

  // Add the last week
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

function processWeeklyRevenueData(dailyData: any[]): any[] {
  const weeklyData: any[] = [];
  let currentWeek: any = null;
  let weekTotals: any = { transfers: 0, invoice: 0, total: 0 };
  let weekStart = "";

  dailyData.forEach((day) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1 || currentWeek === null) { // Monday
      if (currentWeek !== null) {
        const weekEnd = new Date(day.date);
        weekEnd.setDate(weekEnd.getDate() - 1);
        weeklyData.push({
          week: `${weekStart} - ${weekEnd.toISOString().split('T')[0]}`,
          ...weekTotals,
          bill_payment: 0,
          contract: 0,
          taxfiling: 0,
          receipt: 0
        });
      }
      currentWeek = day;
      weekStart = day.date;
      weekTotals = { transfers: day.transfers, invoice: day.invoice, total: day.total };
    } else {
      weekTotals.transfers += day.transfers;
      weekTotals.invoice += day.invoice;
      weekTotals.total += day.total;
    }
  });

  // Add the last week
  if (currentWeek !== null) {
    const weekEnd = dailyData[dailyData.length - 1]?.date || currentWeek.date;
    weeklyData.push({
      week: `${weekStart} - ${weekEnd}`,
      ...weekTotals,
      bill_payment: 0,
      contract: 0,
      taxfiling: 0,
      receipt: 0
    });
  }

  return weeklyData;
}

function processMonthlyRevenueData(dailyData: any[]): any[] {
  const monthlyMap: { [key: string]: any } = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { transfers: 0, invoice: 0, total: 0 };
    }
    
    monthlyMap[monthKey].transfers += day.transfers;
    monthlyMap[monthKey].invoice += day.invoice;
    monthlyMap[monthKey].total += day.total;
  });

  return Object.entries(monthlyMap).map(([month, amounts]) => ({
    month,
    ...amounts,
    bill_payment: 0,
    contract: 0,
    taxfiling: 0,
    receipt: 0
  }));
}
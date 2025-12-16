"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import AdminLayout from "../components/admin-components/layout";
import KPICard from "../components/admin-components/KPICard";
import { Skeleton } from "../components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Users,
  FileText,
  BarChart3,
  RefreshCw,
} from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(text || `Request failed: ${r.status}`);
    }
    return r.json();
  });

type RangeOption = "total" | "today" | "week" | "month" | "year";

// Color schemes for charts
const CHART_COLORS = {
  inflow: "#10b981",
  outflow: "#ef4444",
  contracts: "#3b82f6",
  invoices: "#8b5cf6",
  revenue: "#f59e0b", // New color for revenue
  pie: ["#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#84cc16"],
};

interface GrowthIndicatorProps {
  value: number;
  className?: string;
}

const GrowthIndicator = ({ value, className = "" }: GrowthIndicatorProps) => {
  if (value === 0) {
    return (
      <div className={`flex items-center text-gray-500 ${className}`}>
        <Minus size={14} />
        <span className="ml-1 text-xs">0%</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <div className={`flex items-center ${colorClass} ${className}`}>
      <Icon size={14} />
      <span className="ml-1 text-xs font-medium">
        {Math.abs(value).toFixed(1)}%
      </span>
    </div>
  );
};

export default function AdminDashboard() {
  const [page, setPage] = useState<number>(1);
  const PAGE_LIMIT = 50;

  // Fix hydration issue by using useEffect for localStorage
  const [range, setRange] = useState<RangeOption>("total");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Only access localStorage after component mounts on client
    const savedRange = localStorage.getItem(
      "admin_dashboard_range"
    ) as RangeOption;
    if (savedRange) {
      setRange(savedRange);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("admin_dashboard_range", range);
    }
    setPage(1);
  }, [range, isClient]);

  const { data: summaryData, error: summaryError } = useSWR<any>(
    `/api/admin-apis/dashboard/summary?range=${range}`,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  );

  const { data: paginatedData, error: paginatedError } = useSWR<any>(
    `/api/admin-apis/transactions?page=${page}&range=${range}`,
    fetcher
  );

  useEffect(() => {
    if (paginatedError)
      console.error("Paginated transactions error:", paginatedError);
    if (summaryError) console.error("Summary error:", summaryError);
  }, [paginatedError, summaryError]);

  // Current values
  const totalInflow = Number(summaryData?.totalInflow ?? 0);
  const totalOutflow = Number(summaryData?.totalOutflow ?? 0);
  const mainWalletBalance = Number(summaryData?.mainWalletBalance ?? 0);
  const nombaBalanceRaw = Number(summaryData?.nombaBalance ?? 0);

  // NEW: App Revenue
  const totalAppRevenue = Number(summaryData?.totalAppRevenue ?? 0);
  const transactionFees = Number(summaryData?.transactionFees ?? 0);
  const platformFees = Number(summaryData?.platformFees ?? 0);
  const invoiceFees = Number(summaryData?.invoiceFees ?? 0);

  const totalContracts = Number(summaryData?.totalContractsIssued ?? 0);
  const pendingContracts = Number(summaryData?.pendingContracts ?? 0);
  const signedContracts = Number(summaryData?.signedContracts ?? 0);

  const totalInvoices = Number(summaryData?.totalInvoicesIssued ?? 0);
  const paidInvoices = Number(summaryData?.paidInvoices ?? 0);
  const unpaidInvoices = Number(summaryData?.pendingInvoices ?? 0);
  const totalInvoiceRevenue = Number(summaryData?.totalInvoiceRevenue ?? 0);

  const totalTransactions = Number(summaryData?.totalTransactions ?? 0);
  const successfulTransactions = Number(
    summaryData?.successfulTransactions ?? 0
  );
  const failedTransactions = Number(summaryData?.failedTransactions ?? 0);
  const pendingTransactions = Number(summaryData?.pendingTransactions ?? 0);

  const totalUsers = Number(summaryData?.totalUsers ?? 0);

  // Previous period values for growth calculation (you'll need to implement this in the API)
  const prevTotalInflow = Number(summaryData?.prevTotalInflow ?? 0);
  const prevTotalOutflow = Number(summaryData?.prevTotalOutflow ?? 0);
  const prevTotalAppRevenue = Number(summaryData?.prevTotalAppRevenue ?? 0);
  const prevTotalContracts = Number(summaryData?.prevTotalContracts ?? 0);
  const prevPendingContracts = Number(summaryData?.prevPendingContracts ?? 0);
  const prevSignedContracts = Number(summaryData?.prevSignedContracts ?? 0);
  const prevTotalInvoices = Number(summaryData?.prevTotalInvoices ?? 0);
  const prevPaidInvoices = Number(summaryData?.prevPaidInvoices ?? 0);
  const prevUnpaidInvoices = Number(summaryData?.prevUnpaidInvoices ?? 0);

  // Growth calculations
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const inflowGrowth = calculateGrowth(totalInflow, prevTotalInflow);
  const outflowGrowth = calculateGrowth(totalOutflow, prevTotalOutflow);
  const appRevenueGrowth = calculateGrowth(
    totalAppRevenue,
    prevTotalAppRevenue
  );
  const contractsGrowth = calculateGrowth(totalContracts, prevTotalContracts);
  const pendingContractsGrowth = calculateGrowth(
    pendingContracts,
    prevPendingContracts
  );
  const signedContractsGrowth = calculateGrowth(
    signedContracts,
    prevSignedContracts
  );
  const invoicesGrowth = calculateGrowth(totalInvoices, prevTotalInvoices);
  const paidInvoicesGrowth = calculateGrowth(paidInvoices, prevPaidInvoices);
  const unpaidInvoicesGrowth = calculateGrowth(
    unpaidInvoices,
    prevUnpaidInvoices
  );

  const monthlyTransactions = summaryData?.monthlyTransactions ?? [];
  const monthlyInvoices = summaryData?.monthlyInvoices ?? [];
  const monthlyContracts = summaryData?.monthlyContracts ?? [];
  const monthlyAppRevenue = summaryData?.monthlyAppRevenue ?? [];

  // Data for pie charts
  const contractsPieData = [
    { name: "Signed", value: signedContracts, color: CHART_COLORS.pie[0] },
    { name: "Pending", value: pendingContracts, color: CHART_COLORS.pie[2] },
  ].filter((item) => item.value > 0);

  const invoicesPieData = [
    { name: "Paid", value: paidInvoices, color: CHART_COLORS.pie[0] },
    { name: "Unpaid", value: unpaidInvoices, color: CHART_COLORS.pie[1] },
  ].filter((item) => item.value > 0);

  const cashflowPieData = [
    { name: "Inflow", value: totalInflow, color: CHART_COLORS.pie[0] },
    { name: "Outflow", value: totalOutflow, color: CHART_COLORS.pie[1] },
  ].filter((item) => item.value > 0);

  const revenueBreakdownData = [
    {
      name: "Transaction Fees",
      value: transactionFees,
      color: CHART_COLORS.revenue,
    },
    { name: "Platform Fees", value: platformFees, color: "#84cc16" },
    { name: "Invoice Fees", value: invoiceFees, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  const recentActivity =
    summaryData?.latestTransactions?.slice(0, 5) ??
    paginatedData?.transactions?.slice(0, 5) ??
    [];
  const hasNextPage = paginatedData?.transactions?.length === PAGE_LIMIT;
  const hasPrevPage = page > 1;

  const goNext = () => {
    if (!hasNextPage) return;
    setPage((p) => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (!hasPrevPage) return;
    setPage((p) => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const refresh = async () => {
    await mutate(
      `/api/admin-apis/dashboard/summary?range=${range}&nocache=true`
    );
    await mutate(`/api/admin-apis/transactions?page=${page}&range=${range}`);
  };

  const loading = !summaryData || !paginatedData;

  const formatCurrency = (value: number | string) => {
    const n = Number(value || 0);
    if (n === 0) return "₦0";
    return n.toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Format date safely for client-side only
  const formatDateSafely = (dateString: string) => {
    if (!isClient) return dateString;
    try {
      return new Date(dateString).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Format for chart tooltips
  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(1)}K`;
    }
    return `₦${value}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="px-4 py-6 space-y-8">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(8)
              .fill(null)
              .map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="space-y-3">
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h2>
            <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
              <BarChart3 size={14} />
              <span>Range: {range === "total" ? "All time" : range}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <label className="text-xs text-gray-500 mb-1">Filter Range</label>
              <Select
                value={range}
                onValueChange={(val: RangeOption) => setRange(val)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={refresh}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI Row 1 - Financial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Inflow"
            value={formatCurrency(totalInflow)}
            growth={<GrowthIndicator value={inflowGrowth} />}
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            className="border-l-4 border-l-green-500"
            subtitle="Money coming into the platform"
          />
          <KPICard
            title="Total Outflow"
            value={formatCurrency(totalOutflow)}
            growth={<GrowthIndicator value={outflowGrowth} />}
            // icon={<TrendingDown className="w-5 h-5 text-red-600" />}
            className="border-l-4 border-l-red-500"
            subtitle="Money leaving the platform"
          />
          <KPICard
            title="Main Wallet Balance"
            value={formatCurrency(mainWalletBalance)}
            icon={<Wallet className="w-5 h-5 text-blue-600" />}
            subtitle="Total user wallet balances"
          />
          <KPICard
            title="Admin Wallet (Nomba)"
            value={formatCurrency(nombaBalanceRaw)}
            icon={<CreditCard className="w-5 h-5 text-purple-600" />}
            subtitle="Nomba account balance"
          />
        </div>

        {/* KPI Row 2 - Revenue & Performance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total App Revenue"
            // value={formatCurrency(totalAppRevenue)}
            value={formatCurrency(nombaBalanceRaw - mainWalletBalance)}
            growth={<GrowthIndicator value={appRevenueGrowth} />}
            icon={<DollarSign className="w-5 h-5 text-amber-600" />}
            className="border-l-4 border-l-[#C29307] bg-gradient-to-r from-amber-50 to-white"
            subtitle="Total platform earnings"
          />
          <KPICard
            title="Invoice Reveue"
            value={formatCurrency(invoiceFees)}
            icon={<Receipt className="w-5 h-5 text-violet-600" />}
            subtitle="Revenue from invoices"
          />
          <KPICard
            title="Total Users"
            value={totalUsers.toLocaleString()}
            icon={<Users className="w-5 h-5 text-green-600" />}
            subtitle="Registered users"
          />
          <KPICard
            title="Total Transactions"
            value={totalTransactions.toLocaleString()}
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
            subtitle="All transactions"
          />
        </div>

        {/* KPI Row 3 - Contract & Invoice Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Contracts"
            value={totalContracts.toLocaleString()}
            growth={<GrowthIndicator value={contractsGrowth} />}
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            subtitle="Contracts issued"
          />
          <KPICard
            title="Signed Contracts"
            value={signedContracts.toLocaleString()}
            growth={<GrowthIndicator value={signedContractsGrowth} />}
            icon={<FileText className="w-5 h-5 text-green-600" />}
            subtitle="Contracts signed"
          />
          <KPICard
            title="Paid Invoices"
            value={paidInvoices.toLocaleString()}
            growth={<GrowthIndicator value={paidInvoicesGrowth} />}
            icon={<Receipt className="w-5 h-5 text-green-600" />}
            subtitle="Invoices paid"
          />
          <KPICard
            title="Unpaid Invoices"
            value={unpaidInvoices.toLocaleString()}
            growth={<GrowthIndicator value={unpaidInvoicesGrowth} />}
            icon={<Receipt className="w-5 h-5 text-red-600" />}
            subtitle="Invoices pending"
          />
        </div>

        {/* Charts Section - Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* App Revenue Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                💰 App Revenue Trend
              </h3>
              <div className="text-sm text-gray-500">Filtered: {range}</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyAppRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_COLORS.revenue}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.revenue}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.revenue}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                📊 Revenue Breakdown
              </h3>
              <div className="text-sm text-gray-500">Sources</div>
            </div>
            <div className="h-64">
              {revenueBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Amount",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No revenue data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section - Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                📈 Transactions Trend
              </h3>
              <div className="text-sm text-gray-500">Filtered: {range}</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTransactions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Amount",
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke={CHART_COLORS.inflow}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.inflow, strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: CHART_COLORS.inflow,
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Invoices Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                🧾 Invoices (Monthly)
              </h3>
              <div className="text-sm text-gray-500">Filtered: {range}</div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyInvoices}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "count") return [value, "Invoice Count"];
                    return [formatCurrency(value), "Revenue"];
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Invoice Count"
                  fill={CHART_COLORS.invoices}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Contracts Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                📄 Contracts (Monthly)
              </h3>
              <div className="text-sm text-gray-500">Filtered: {range}</div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyContracts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.contracts}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🕒 Recent Transactions
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">Page: {page}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={!hasPrevPage}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !hasPrevPage
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={!hasNextPage}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !hasNextPage
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentActivity.length > 0 ? (
                  recentActivity.map((tx: any) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(tx.amount)}
                        </div>
                        {tx.fee > 0 && (
                          <div className="text-xs text-amber-600 mt-1">
                            Fee: {formatCurrency(tx.fee)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (tx.type?.toLowerCase() || "").includes("fee")
                              ? "bg-amber-100 text-amber-800"
                              : (tx.type?.toLowerCase() || "").includes(
                                  "deposit"
                                ) ||
                                (tx.type?.toLowerCase() || "").includes(
                                  "received"
                                )
                              ? "bg-green-100 text-green-800"
                              : (tx.type?.toLowerCase() || "").includes(
                                  "withdrawal"
                                ) ||
                                (tx.type?.toLowerCase() || "").includes("sent")
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {tx.type || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === "success"
                              ? "bg-green-100 text-green-800"
                              : tx.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tx.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateSafely(tx.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 Platform Performance Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border">
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalTransactions > 0
                  ? `${(
                      (successfulTransactions / totalTransactions) *
                      100
                    ).toFixed(1)}%`
                  : "0%"}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <div className="text-sm text-gray-500">Avg. Revenue per User</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalUsers > 0 && totalAppRevenue > 0
                  ? formatCurrency(totalAppRevenue / totalUsers)
                  : formatCurrency(0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <div className="text-sm text-gray-500">Transaction Value</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalTransactions > 0
                  ? formatCurrency(
                      (totalInflow + totalOutflow) / totalTransactions
                    )
                  : formatCurrency(0)}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Revenue Sources:</span>
              {revenueBreakdownData.length > 0
                ? revenueBreakdownData.map((r) => ` ${r.name}`).join(", ")
                : " None detected"}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Data Range:</span>{" "}
              {range === "total" ? "All time" : range}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Last Updated:</span>{" "}
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import useSWR from "swr";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import AdminLayout from "@/app/components/admin-components/layout";
import Loader from "@/app/components/Loader";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";

// Enhanced fetcher with better error handling
const fetcher = async (url: string) => {
  console.log('🔄 Fetching:', url);
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error(`API Error: ${res.status} ${res.statusText}`);
    console.error('❌ Fetch error:', { url, status: res.status, statusText: res.statusText });
    throw error;
  }
  
  const data = await res.json();
  console.log('✅ Fetch success:', { url, data });
  return data;
};

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
}

export default function UserProfilePage({
  userId,
  onBack,
}: UserProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPages, setCurrentPages] = useState({
    contracts: 1,
    receipts: 1,
    invoices: 1,
    transactions: 1
  });

  console.log('🔍 UserProfilePage State:', {
    userId,
    activeTab,
    searchTerm,
    debouncedSearch,
    currentPages
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPages(prev => ({
        contracts: 1,
        receipts: 1,
        invoices: 1,
        transactions: 1
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch user details
  const {
    data: userData,
    error: userError,
    isLoading: userLoading,
  } = useSWR(
    userId ? `/api/admin-apis/users/${userId}` : null, 
    fetcher,
    {
      onSuccess: (data) => console.log('✅ User data loaded:', data),
      onError: (error) => console.error('❌ User data error:', error)
    }
  );

  // Fetch total counts immediately when page loads
  const { data: contractsCountData } = useSWR(
    userId ? `/api/admin-apis/users/${userId}/contracts?page=1&limit=1` : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Contracts count:', data?.pagination?.totalItems),
      onError: (error) => console.error('❌ Contracts count error:', error)
    }
  );

  const { data: receiptsCountData } = useSWR(
    userId ? `/api/admin-apis/users/${userId}/receipts?page=1&limit=1` : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Receipts count:', data?.pagination?.totalItems),
      onError: (error) => console.error('❌ Receipts count error:', error)
    }
  );

  const { data: invoicesCountData } = useSWR(
    userId ? `/api/admin-apis/users/${userId}/invoices?page=1&limit=1` : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Invoices count:', data?.pagination?.totalItems),
      onError: (error) => console.error('❌ Invoices count error:', error)
    }
  );

  const { data: transactionsCountData } = useSWR(
    userId ? `/api/admin-apis/users/${userId}/transactions?page=1&limit=1` : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Transactions count:', data?.pagination?.totalItems),
      onError: (error) => console.error('❌ Transactions count error:', error)
    }
  );

  // Get total counts
  const totalCounts = {
    contracts: contractsCountData?.pagination?.totalItems || 0,
    receipts: receiptsCountData?.pagination?.totalItems || 0,
    invoices: invoicesCountData?.pagination?.totalItems || 0,
    transactions: transactionsCountData?.pagination?.totalItems || 0,
  };

  console.log('📊 Total counts:', totalCounts);

  // Build API URLs with proper parameters
  const getApiUrl = (endpoint: string, page: number) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '6', // Fetch 6 items per page
      ...(debouncedSearch && { search: debouncedSearch })
    });
    
    const url = `/api/admin-apis/users/${userId}/${endpoint}?${params}`;
    console.log(`🔗 ${endpoint} URL:`, url);
    return url;
  };

  // Fetch detailed data for current tab only
  const { data: contractsData, isLoading: contractsLoading } = useSWR(
    activeTab === "contracts" ? getApiUrl('contracts', currentPages.contracts) : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Contracts data:', data),
      onError: (error) => console.error('❌ Contracts error:', error)
    }
  );

  const { data: receiptsData, isLoading: receiptsLoading } = useSWR(
    activeTab === "receipts" ? getApiUrl('receipts', currentPages.receipts) : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Receipts data:', data),
      onError: (error) => console.error('❌ Receipts error:', error)
    }
  );

  const { data: invoicesData, isLoading: invoicesLoading } = useSWR(
    activeTab === "invoices" ? getApiUrl('invoices', currentPages.invoices) : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Invoices data:', data),
      onError: (error) => console.error('❌ Invoices error:', error)
    }
  );

  const { data: transactionsData, isLoading: transactionsLoading } = useSWR(
    activeTab === "transactions" ? getApiUrl('transactions', currentPages.transactions) : null,
    fetcher,
    {
      onSuccess: (data) => console.log('✅ Transactions data:', data),
      onError: (error) => console.error('❌ Transactions error:', error)
    }
  );

  // Handle page change
  const handlePageChange = (tab: string, page: number) => {
    console.log(`📄 Changing ${tab} page to:`, page);
    setCurrentPages(prev => ({
      ...prev,
      [tab]: page
    }));
  };

  // Reset search when tab changes
  const handleTabChange = (value: string) => {
    console.log('🔀 Changing tab to:', value);
    setSearchTerm("");
    setActiveTab(value);
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "contracts": return { data: contractsData, loading: contractsLoading };
      case "receipts": return { data: receiptsData, loading: receiptsLoading };
      case "invoices": return { data: invoicesData, loading: invoicesLoading };
      case "transactions": return { data: transactionsData, loading: transactionsLoading };
      default: return { data: null, loading: false };
    }
  };

  const { data: currentData, loading: currentLoading } = getCurrentData();
  const currentItems = currentData?.[activeTab] || [];
  const pagination = currentData?.pagination;

  console.log('📊 Current state:', {
    activeTab,
    currentItems: currentItems.length,
    currentLoading,
    pagination
  });

    const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (pageLoading) {
    return <Loader />;
  }


  if (userLoading) {
    return (
      <AdminLayout>
       
          <Loader />
     
      </AdminLayout>
    );
  }

  if (userError || !userData?.user) {
    console.error('❌ User error:', userError);
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={onBack}>
              ← Back to Users
            </Button>
          </div>
          <p className="text-red-600">Failed to load user details ❌</p>
          <p className="text-sm text-gray-500 mt-2">
            Error: {userError?.message || 'User not found'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const user = userData.user;
  console.log('👤 User loaded:', user);

  // Render functions remain the same...
  const renderStatusBadge = (isBlocked: boolean, status: string) => {
    if (isBlocked) {
      return <Badge variant="destructive">⛔ Blocked</Badge>;
    } else if (status === "active") {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          ● Active
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const renderRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge
          variant="default"
          className="bg-purple-100 text-purple-800 border-purple-200"
        >
          👑 Admin
        </Badge>
      );
    }
    return <Badge variant="outline">👤 User</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const renderItemStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
      case "paid":
      case "verified":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            {status}
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 border-yellow-200"
          >
            {status}
          </Badge>
        );
      case "failed":
      case "rejected":
      case "cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTransactionTypeBadge = (type: string) => {
    if (type === "credit") {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Credit
        </Badge>
      );
    } else if (type === "debit") {
      return <Badge variant="destructive">Debit</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={() => handlePageChange(activeTab, pagination.currentPage - 1)}
                className={!pagination.hasPrevPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: pagination.totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={i + 1 === pagination.currentPage}
                  onClick={() => handlePageChange(activeTab, i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={() => handlePageChange(activeTab, pagination.currentPage + 1)}
                className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  const renderItems = () => {
    console.log('🎨 Rendering items:', currentItems.length);

    switch (activeTab) {
      case "contracts":
        return currentItems.map((contract: any) => (
          <div key={contract.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  {contract.title || "Untitled Contract"}
                </h4>
                <p className="text-sm text-gray-500">ID: {contract.id}</p>
                <p className="text-sm">
                  Status: {renderItemStatusBadge(contract.status)}
                </p>
                <p className="text-sm text-gray-500">Role: {contract.role}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(contract.created_at)}
                </p>
                {contract.signed_at && (
                  <p className="text-sm text-green-600">
                    Signed: {formatDate(contract.signed_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ));

      case "receipts":
        return currentItems.map((receipt: any) => (
          <div key={receipt.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  Receipt #{receipt.receipt_number}
                </h4>
                <p className="text-sm text-gray-500">ID: {receipt.id}</p>
                <p className="text-sm">For: {receipt.payment_for}</p>
                <p className="text-sm">
                  Status: {renderItemStatusBadge(receipt.status)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(receipt.created_at)}
                </p>
                <p className="font-medium text-green-600">
                  {formatCurrency(receipt.amount)}
                </p>
                {receipt.signed_at && (
                  <p className="text-sm text-green-600">
                    Signed: {formatDate(receipt.signed_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ));

      case "invoices":
        return currentItems.map((invoice: any) => (
          <div key={invoice.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  Invoice #{invoice.invoice_number}
                </h4>
                <p className="text-sm text-gray-500">ID: {invoice.id}</p>
                <p className="text-sm">For: {invoice.description}</p>
                <p className="text-sm">Bill To: {invoice.bill_to}</p>
                <p className="text-sm">
                  Status: {renderItemStatusBadge(invoice.status)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(invoice.created_at)}
                </p>
                <p className="font-medium">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
            </div>
          </div>
        ));

      case "transactions":
        return currentItems.map((transaction: any) => (
          <div key={transaction.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  {transaction.description}
                </h4>
                <p className="text-sm text-gray-500">ID: {transaction.id}</p>
                <p className="text-sm">
                  Type: {renderTransactionTypeBadge(transaction.type)}
                </p>
                <p className="text-sm">
                  Reference: {transaction.reference}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(transaction.created_at)}
                </p>
                <p
                  className={`font-medium ${
                    transaction.type === "credit"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.type === "credit" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-sm">
                  Balance: {formatCurrency(transaction.balance_after)}
                </p>
              </div>
            </div>
          </div>
        ));

      default:
        return null;
    }
  };

  const renderSearchAndResults = () => {
    return (
      <>
        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Results Count */}
        {!currentLoading && (
          <div className="text-sm text-gray-500 mb-4">
            Showing {currentItems.length} of {pagination?.totalItems || 0} {activeTab}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </div>
        )}

        {/* Content */}
        {currentLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : currentItems.length > 0 ? (
          <div className="space-y-4">
            {renderItems()}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {debouncedSearch 
              ? `No ${activeTab} found matching "${debouncedSearch}"`
              : `No ${activeTab} found for this user.`
            }
          </p>
        )}

        {/* Pagination */}
        {renderPagination()}
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Users
            </Button>
            <div>
              <h2 className="text-2xl font-semibold">User Profile</h2>
              <p className="text-gray-500">
                Detailed view of user account and activities
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {renderStatusBadge(user.is_blocked, user.status)}
            {renderRoleBadge(user.role)}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {/* Updated TabsList with pre-loaded counts */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">
              Contracts ({totalCounts.contracts})
            </TabsTrigger>
            <TabsTrigger value="receipts">
              Receipts ({totalCounts.receipts})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices ({totalCounts.invoices})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions ({totalCounts.transactions})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>User account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Full Name
                      </label>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="font-medium">
                        {user.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Wallet Balance
                      </label>
                      <p className="font-medium text-green-600">
                        {formatCurrency(user.wallet_balance || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                  <CardDescription>
                    Login and account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Account Created
                      </label>
                      <p className="font-medium">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Last Login
                      </label>
                      <p className="font-medium">
                        {formatDate(user.last_login)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Last Logout
                      </label>
                      <p className="font-medium">
                        {formatDate(user.last_logout)}
                      </p>
                    </div>
                    {user.is_blocked && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Block Reason
                        </label>
                        <p className="font-medium text-red-600">
                          {user.block_reason || "No reason provided"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats - Updated with pre-loaded counts */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                  <CardDescription>User engagement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {totalCounts.contracts}
                      </p>
                      <p className="text-sm text-blue-600">Contracts</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {totalCounts.receipts}
                      </p>
                      <p className="text-sm text-green-600">Receipts</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {totalCounts.invoices}
                      </p>
                      <p className="text-sm text-purple-600">Invoices</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {totalCounts.transactions}
                      </p>
                      <p className="text-sm text-orange-600">Transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Tabs */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>User Contracts</CardTitle>
                <CardDescription>
                  All contracts created by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSearchAndResults()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle>User Receipts</CardTitle>
                <CardDescription>
                  All receipts associated with this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSearchAndResults()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>User Invoices</CardTitle>
                <CardDescription>
                  All invoices created for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSearchAndResults()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>User Transactions</CardTitle>
                <CardDescription>
                  All financial transactions by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSearchAndResults()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
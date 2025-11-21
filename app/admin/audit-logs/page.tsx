"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import AdminLayout from "@/app/components/admin-components/layout";
import Loader from "@/app/components/Loader";
import AuditLogsTable from "@/app/components/admin-components/AuditLogs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

// Type definitions
interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: {
    search: string;
    action: string;
    resourceType: string;
    startDate?: string;
    endDate?: string;
  };
}

const fetcher = (url: string): Promise<AuditLogsResponse> => 
  fetch(url).then((res) => res.json());

// Common audit log actions and resource types for better filtering
const COMMON_ACTIONS = [
  "create", "update", "delete", "login", "logout", "view", "export",
  "approve", "reject", "block", "unblock", "reset", "download"
];

const COMMON_RESOURCE_TYPES = [
  "user", "admin", "contract", "transaction", "system", "audit",
  "report", "payment", "wallet", "document", "settings"
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const itemsPerPage = 10;

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
    });

    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }

    if (actionFilter && actionFilter !== 'all') {
      params.append('action', actionFilter);
    }

    if (resourceTypeFilter && resourceTypeFilter !== 'all') {
      params.append('resourceType', resourceTypeFilter);
    }

    return params.toString();
  };

  const { data, error, isLoading, mutate } = useSWR<AuditLogsResponse>(
    `/api/admin-apis/audit-logs?${buildQueryParams()}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false,
    }
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, resourceTypeFilter]);

  const handleRefresh = () => {
    mutate();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setResourceTypeFilter("all");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-red-600 text-center mb-4">
            Failed to load audit logs ❌
          </p>
          <div className="text-center">
            <Button onClick={handleRefresh} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  // Extract unique actions and resource types from logs for dynamic filters
  const uniqueActions = [...new Set(logs.map((log: AuditLog) => log.action))].filter(Boolean);
  const uniqueResourceTypes = [...new Set(logs.map((log: AuditLog) => log.resource_type))].filter(Boolean);

  const hasActiveFilters = searchTerm || actionFilter !== "all" || resourceTypeFilter !== "all";

  // Count user actions vs system actions with proper typing
  const userActionsCount = logs.filter((log: AuditLog) => log.user_email).length;
  const systemActionsCount = logs.filter((log: AuditLog) => !log.user_email).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Audit Logs 🕵️</h2>
            <p className="text-gray-600 mt-1">
              Track admin and system-level actions
            </p>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                🗑️ Clear Filters
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh}>
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="w-full md:w-1/3">
            <Input
              placeholder="Search actions, users, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action Filter */}
          <div className="w-full md:w-1/4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {COMMON_ACTIONS.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
                {/* Dynamic actions from current data */}
                {uniqueActions
                  .filter((action: string) => !COMMON_ACTIONS.includes(action))
                  .map(action => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div className="w-full md:w-1/4">
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {COMMON_RESOURCE_TYPES.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource.charAt(0).toUpperCase() + resource.slice(1)}
                  </SelectItem>
                ))}
                {/* Dynamic resource types from current data */}
                {uniqueResourceTypes
                  .filter((resource: string) => !COMMON_RESOURCE_TYPES.includes(resource))
                  .map(resource => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span>Active filters:</span>
                {searchTerm && (
                  <span className="bg-blue-100 px-2 py-1 rounded">Search: "{searchTerm}"</span>
                )}
                {actionFilter !== "all" && (
                  <span className="bg-blue-100 px-2 py-1 rounded">Action: {actionFilter}</span>
                )}
                {resourceTypeFilter !== "all" && (
                  <span className="bg-blue-100 px-2 py-1 rounded">Resource: {resourceTypeFilter}</span>
                )}
              </div>
              <span className="text-blue-600 text-sm">
                Showing {logs.length} of {pagination?.total || 0} logs
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Logs</h3>
            <p className="text-2xl font-semibold">
              {pagination?.total || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">User Actions</h3>
            <p className="text-2xl font-semibold text-blue-600">
              {userActionsCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">System Actions</h3>
            <p className="text-2xl font-semibold text-green-600">
              {systemActionsCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">This Page</h3>
            <p className="text-2xl font-semibold text-purple-600">
              {logs.length}
            </p>
          </div>
        </div>

        {/* Table */}
        {logs.length > 0 ? (
          <AuditLogsTable logs={logs} />
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-gray-500 text-lg mb-2">No audit logs found</div>
            <div className="text-gray-400 text-sm">
              {hasActiveFilters 
                ? "Try adjusting your filters to see more results" 
                : "Audit logs will appear here as actions are performed"
              }
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }).map((_, i) => {
                  // Show limited pagination for better UX
                  const pageNum = i + 1;
                  const showPage = 
                    pageNum === 1 || 
                    pageNum === pagination.totalPages ||
                    Math.abs(pageNum - currentPage) <= 1;

                  if (!showPage && Math.abs(pageNum - currentPage) === 2) {
                    return (
                      <PaginationItem key={i}>
                        <span className="px-3 py-2 text-gray-500">...</span>
                      </PaginationItem>
                    );
                  }

                  return showPage ? (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ) : null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))
                    }
                    className={currentPage >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
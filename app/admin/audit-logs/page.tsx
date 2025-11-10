"use client";

import useSWR from "swr";
import { useState } from "react";
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const itemsPerPage = 10;

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin-apis/audit-logs?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&action=${actionFilter !== 'all' ? actionFilter : ''}&resourceType=${resourceTypeFilter !== 'all' ? resourceTypeFilter : ''}`,
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

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
        <p className="p-6 text-red-600 text-center">
          Failed to load audit logs ❌
        </p>
      </AdminLayout>
    );
  }

  const logs = data?.logs || [];
  const pagination = data?.pagination;

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
          <Button variant="outline" onClick={() => mutate()}>
            🔄 Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="w-full md:w-1/3">
            <Input
              placeholder="Search actions, users, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action Filter */}
          <div className="w-full md:w-1/4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div className="w-full md:w-1/4">
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
              {logs.filter((log:any) => log.user_email).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">System Actions</h3>
            <p className="text-2xl font-semibold text-green-600">
              {logs.filter((log:any) => !log.user_email).length}
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
        <AuditLogsTable logs={logs} />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i + 1 === currentPage}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))
                    }
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
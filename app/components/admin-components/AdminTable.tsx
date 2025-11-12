"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";

// 🧭 Helper to detect and format date-like values (client-side only)
function formatValue(key: string, value: any) {
  if (!value) return "-";

  // If key looks like a date field and value is valid date
  if (/(date|created_at|updated_at|timestamp|blocked_at|last_login|last_logout)/i.test(key)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch (error) {
      console.error("Date formatting error:", error);
    }
  }

  // Default
  return String(value);
}

// Updated Column type with optional render function
type Column = { 
  key: string; 
  label: string; 
  render?: (value: any, row: any) => React.ReactNode;
};

// Custom action type
type CustomAction = {
  label: string;
  onClick: (row: any) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  icon?: string;
};

type AdminTableProps = {
  columns: Column[];
  rows: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onDownload?: (row: any) => void;
  onBlockToggle?: (row: any) => void;
  onForceLogout?: (row: any) => void;
  onViewLoginHistory?: (row: any) => void;
  onViewDetails?: (row: any) => void;
  onRetryTransaction?: (row: any) => void;
  onRowClick?: (row: any) => void; // NEW: Add row click handler
  customActions?: CustomAction[];
  emptyMessage?: string;
  searchPlaceholder?: string;
};

export default function AdminTable({
  columns,
  rows,
  onEdit,
  onDelete,
  onDownload,
  onBlockToggle,
  onForceLogout,
  onViewLoginHistory,
  onViewDetails,
  onRetryTransaction,
  onRowClick, // NEW: Add row click handler
  customActions = [],
  emptyMessage = "No records found",
}: AdminTableProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to render cell content
  const renderCellContent = (column: Column, row: any) => {
    const value = row[column.key];
    
    // Use custom render function if provided
    if (column.render) {
      return column.render(value, row);
    }
    
    // Otherwise use default formatting (only on client to avoid hydration mismatch)
    if (isClient) {
      return formatValue(column.key, value);
    }
    
    // Server-side fallback - return simple string without formatting
    return value || "-";
  };

  // Check if there are any actions to show
  const hasActions = onEdit || onDelete || onDownload || onBlockToggle || 
                    onForceLogout || onViewLoginHistory || onViewDetails || 
                    onRetryTransaction || customActions.length > 0;

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-center">S/N</TableHead>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {hasActions && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <TableRow 
                key={row.id || index}
                className={onRowClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}
                onClick={() => onRowClick?.(row)}
              >
                <TableCell className="text-center">{index + 1}</TableCell>

                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {renderCellContent(col, row)}
                  </TableCell>
                ))}

                {hasActions && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Custom Actions */}
                        {customActions.map((action, actionIndex) => (
                          <DropdownMenuItem
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={action.className}
                          >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </DropdownMenuItem>
                        ))}

                        {/* Transaction Actions */}
                        {onViewDetails && (
                          <DropdownMenuItem onClick={() => onViewDetails(row)}>
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onRetryTransaction && (
                          <DropdownMenuItem 
                            onClick={() => onRetryTransaction(row)}
                            className={row.status === "failed" ? "text-orange-600" : "text-gray-400"}
                            disabled={row.status !== "failed"}
                          >
                            Retry Transaction
                          </DropdownMenuItem>
                        )}

                        {/* User Actions */}
                        {onDownload && (
                          <DropdownMenuItem onClick={() => onDownload(row)}>
                            Download Documents
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onBlockToggle && (
                          <DropdownMenuItem
                            onClick={() => onBlockToggle(row)}
                            className={
                              row.is_blocked || row.status === 'inactive'
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {row.is_blocked || row.status === 'inactive'
                              ? "🔄 Activate"
                              : "⛔ Deactivate"}
                          </DropdownMenuItem>
                        )}
                        {onForceLogout && (
                          <DropdownMenuItem
                            onClick={() => onForceLogout(row)}
                            className="text-orange-600"
                          >
                            🚪 Force Logout
                          </DropdownMenuItem>
                        )}
                        {onViewLoginHistory && (
                          <DropdownMenuItem
                            onClick={() => onViewLoginHistory(row)}
                            className="text-blue-600"
                          >
                            📊 View Login History
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(row)}
                            className="text-red-600"
                          >
                            🗑️ Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (hasActions ? 2 : 1)} 
                className="text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
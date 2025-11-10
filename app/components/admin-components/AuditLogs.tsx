"use client";

import { Badge } from "@/app/components/ui/badge";

interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  location?: any;
  metadata?: any;
  created_at: string;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
}

export default function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const getActionVariant = (action: string) => {
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    if (action.includes('delete')) return 'destructive';
    if (action.includes('login')) return 'outline';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLocationString = (location: any) => {
    if (!location) return 'Unknown';
    const parts = [location.city, location.region, location.country].filter(Boolean);
    return parts.join(', ') || 'Unknown';
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Action</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-left py-3 px-4 font-medium">IP & Location</th>
                <th className="text-left py-3 px-4 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Badge variant={getActionVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {log.resource_type}
                      {log.resource_id && ` • ${log.resource_id}`}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium">{log.user_email || 'System'}</div>
                    {log.user_id && (
                      <div className="text-xs text-gray-500">{log.user_id}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">{log.description}</div>
                    {log.metadata && (
                      <div className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">{log.ip_address || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">
                      {getLocationString(log.location)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No audit logs found
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import useSWR from "swr";
import { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import AdminLayout from "@/app/components/admin-components/layout";
import Loader from "@/app/components/Loader";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Markdown parser for preview
const parseMarkdown = (text: string) => {
  if (!text) return '';
  
  return text
    // Headers
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/gim, '<s class="line-through">$1</s>')
    // Links
    .replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-blue-500 underline hover:text-blue-700" target="_blank">$1</a>')
    // Line breaks
    .replace(/\n/gim, '<br />')
    // Image placeholder
    .replace(/\[Image: (.*?)\]/gim, '<div class="bg-gray-100 border rounded p-2 my-2 text-sm text-gray-600">🖼️ Image: $1</div>');
};

export default function NotificationsCenterPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [dateRange, setDateRange] = useState("total");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    channels: ["in_app"],
    target_audience: "all_users",
    scheduled_for: "",
    is_urgent: false,
    specific_users: [] as string[]
  });
  const [userSearch, setUserSearch] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlText, setUrlText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const itemsPerPage = 15;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatting functions
  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newNotification.message.substring(start, end);
    const before = newNotification.message.substring(0, start);
    const after = newNotification.message.substring(end);

    let newText;
    if (selectedText) {
      newText = before + prefix + selectedText + suffix + after;
    } else {
      newText = before + prefix + suffix + after;
    }

    setNewNotification({...newNotification, message: newText});

    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = selectedText ? start + prefix.length + selectedText.length + suffix.length : start + prefix.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const applyHeader = (level: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newNotification.message.substring(start, end);
    const before = newNotification.message.substring(0, start);
    const after = newNotification.message.substring(end);

    const headerPrefix = `${'#'.repeat(level)} `;
    
    let newText;
    if (selectedText) {
      newText = before + headerPrefix + selectedText + after;
    } else {
      newText = before + headerPrefix + after;
    }

    setNewNotification({...newNotification, message: newText});

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = selectedText ? start + headerPrefix.length + selectedText.length : start + headerPrefix.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = newNotification.message.substring(0, start);
    const after = newNotification.message.substring(start);

    const newText = before + emoji + after;
    setNewNotification({...newNotification, message: newText});
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }
    }, 0);
  };

  const insertUrl = () => {
    if (!urlText || !urlInput) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = newNotification.message.substring(0, start);
    const after = newNotification.message.substring(start);

    const urlMarkdown = `[${urlText}](${urlInput})`;
    const newText = before + urlMarkdown + after;
    setNewNotification({...newNotification, message: newText});

    setShowUrlInput(false);
    setUrlText("");
    setUrlInput("");

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + urlMarkdown.length, start + urlMarkdown.length);
      }
    }, 0);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In a real application, you would upload the file to your server
    // and get back a URL. For now, we'll create a mock URL pattern.
    const mockImageUrl = `[Image: ${file.name}]`;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = newNotification.message.substring(0, start);
    const after = newNotification.message.substring(start);

    const newText = before + mockImageUrl + after;
    setNewNotification({...newNotification, message: newText});

    // Reset the file input
    event.target.value = '';

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + mockImageUrl.length, start + mockImageUrl.length);
      }
    }, 0);
  };

  // Fetch users for suggestions
  const { data: usersData, isLoading: isUsersLoading } = useSWR(
    userSearch ? `/api/admin-apis/notifications/users/search?search=${encodeURIComponent(userSearch)}&limit=100` : null,
    fetcher
  );

  useEffect(() => {
    if (usersData?.users) {
      console.log("Found users:", usersData.users.length);
      setUserSuggestions(usersData.users);
      setIsSearchingUsers(false);
    }
  }, [usersData]);

  // Handle user search input with debounce
  useEffect(() => {
    if (userSearch) {
      setIsSearchingUsers(true);
    } else {
      setUserSuggestions([]);
      setIsSearchingUsers(false);
    }
  }, [userSearch]);

  // Build API URL with all filters for server-side filtering
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      range: dateRange,
    });

    if (searchTerm) params.append('search', searchTerm);
    if (typeFilter !== 'all') params.append('type', typeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (channelFilter !== 'all') params.append('channel', channelFilter);

    return `/api/admin-apis/notifications?${params.toString()}`;
  }, [currentPage, dateRange, searchTerm, typeFilter, statusFilter, channelFilter, itemsPerPage]);

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher);

  // Separate hook for stats
  const statsApiUrl = useMemo(() => {
    const params = new URLSearchParams({
      range: dateRange,
      limit: '10000',
    });

    if (searchTerm) params.append('search', searchTerm);
    if (typeFilter !== 'all') params.append('type', typeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (channelFilter !== 'all') params.append('channel', channelFilter);

    return `/api/admin-apis/notifications?${params.toString()}`;
  }, [dateRange, searchTerm, typeFilter, statusFilter, channelFilter]);

  const { data: statsData } = useSWR(statsApiUrl, fetcher);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, channelFilter, dateRange]);

  // Reset user selection when target audience changes
  useEffect(() => {
    if (newNotification.target_audience !== "specific_users") {
      setSelectedUsers([]);
      setNewNotification(prev => ({
        ...prev,
        specific_users: []
      }));
    }
  }, [newNotification.target_audience]);

  // Memoize calculations
  const notifications = useMemo(() => data?.notifications || [], [data]);
  const totalNotifications = useMemo(() => data?.total || 0, [data]);
  const totalPages = useMemo(() => Math.ceil(totalNotifications / itemsPerPage), [totalNotifications, itemsPerPage]);

  // Use statsData for calculations
  const allFilteredNotifications = useMemo(() => statsData?.notifications || [], [statsData]);

  // Calculate stats
  const sentNotifications = useMemo(() => 
    allFilteredNotifications.filter((n: any) => n.status === "sent"), 
    [allFilteredNotifications]
  );

  const scheduledNotifications = useMemo(() => 
    allFilteredNotifications.filter((n: any) => n.status === "scheduled"), 
    [allFilteredNotifications]
  );

  const failedNotifications = useMemo(() => 
    allFilteredNotifications.filter((n: any) => n.status === "failed"), 
    [allFilteredNotifications]
  );

  const pushNotifications = useMemo(() => 
    allFilteredNotifications.filter((n: any) => n.channels?.includes("push")), 
    [allFilteredNotifications]
  );

  const emailNotifications = useMemo(() => 
    allFilteredNotifications.filter((n: any) => n.channels?.includes("email")), 
    [allFilteredNotifications]
  );

  // User selection handlers
  const handleAddUser = (user: any) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      const updatedUsers = [...selectedUsers, user];
      setSelectedUsers(updatedUsers);
      setNewNotification(prev => ({
        ...prev,
        specific_users: updatedUsers.map(u => u.id)
      }));
    }
    setUserSearch("");
    setUserSuggestions([]);
  };

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = selectedUsers.filter(user => user.id !== userId);
    setSelectedUsers(updatedUsers);
    setNewNotification(prev => ({
      ...prev,
      specific_users: updatedUsers.map(u => u.id)
    }));
  };

  // Create new notification
  const handleCreateNotification = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate specific users selection
      if (newNotification.target_audience === "specific_users" && selectedUsers.length === 0) {
        Swal.fire("Error", "Please select at least one user for specific user notification", "error");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/admin-apis/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotification),
      });

      const result = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Notification Created!",
          text: "Your notification has been scheduled successfully",
          timer: 2000,
          showConfirmButton: false,
        });
        
        setShowCreateModal(false);
        setNewNotification({
          title: "",
          message: "",
          type: "info",
          channels: ["in_app"],
          target_audience: "all_users",
          scheduled_for: "",
          is_urgent: false,
          specific_users: []
        });
        setSelectedUsers([]);
        setUserSearch("");
        setUserSuggestions([]);
        setShowPreview(false);
        mutate();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      Swal.fire("Error", "Failed to create notification", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send notification immediately
  const handleSendNow = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin-apis/notifications/${notificationId}/send`, {
        method: "POST",
      });
      
      const result = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Notification Sent!",
          text: "The notification has been sent immediately",
          timer: 2000,
          showConfirmButton: false,
        });
        
        mutate();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to send notification", "error");
    }
  };

  // Cancel scheduled notification
  const handleCancel = async (notificationId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Notification?',
      text: 'This will cancel the scheduled notification',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Cancel Notification',
      cancelButtonText: 'Keep Scheduled'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin-apis/notifications?id=${notificationId}`, {
          method: "DELETE",
        });
        
        const deleteResult = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Cancelled!",
            text: "The notification has been cancelled",
            timer: 2000,
            showConfirmButton: false,
          });
          
          mutate();
        } else {
          throw new Error(deleteResult.error);
        }
      } catch (err: any) {
        Swal.fire("Error", err.message || "Failed to cancel notification", "error");
      }
    }
  };

  // Custom renderers
  const renderTypeBadge = (type: string) => {
    const typeConfig: any = {
      info: { color: "bg-blue-100 text-blue-800", text: "ℹ️ Info" },
      success: { color: "bg-green-100 text-green-800", text: "✅ Success" },
      warning: { color: "bg-yellow-100 text-yellow-800", text: "⚠️ Warning" },
      error: { color: "bg-red-100 text-red-800", text: "❌ Error" },
      contract: { color: "bg-purple-100 text-purple-800", text: "📝 Contract" },
      wallet: { color: "bg-orange-100 text-orange-800", text: "💰 Wallet" },
      transaction: { color: "bg-indigo-100 text-indigo-800", text: "💸 Transaction" }
    };

    const config = typeConfig[type] || { color: "bg-gray-100 text-gray-800", text: type };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const renderStatusBadge = (status: string) => {
    const statusConfig: any = {
      draft: { color: "bg-gray-100 text-gray-800", text: "📝 Draft" },
      scheduled: { color: "bg-yellow-100 text-yellow-800", text: "⏰ Scheduled" },
      sent: { color: "bg-green-100 text-green-800", text: "✅ Sent" },
      failed: { color: "bg-red-100 text-red-800", text: "❌ Failed" }
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const renderChannels = (channels: string[]) => {
    const channelIcons: any = {
      in_app: "📱",
      email: "📧",
      // sms: "💬",
      // push: "🔔"
    };

    return (
      <div className="flex space-x-1">
        {channels?.map((channel) => (
          <Badge key={channel} variant="outline" className="text-xs">
            {channelIcons[channel] || "📦"} {channel}
          </Badge>
        ))}
      </div>
    );
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
        <div className="text-center text-red-500 mt-10">Failed to load notifications.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">🔔 Notifications Center</h2>
            <p className="text-gray-600">Manage platform alerts and communications</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => mutate()}>
              🔄 Refresh
            </Button>
            <Button 
              className="bg-[#C29307] text-white hover:bg-[#a87e06]" 
              onClick={() => setShowCreateModal(true)}
            >
              📢 Create Notification
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
            <p className="text-2xl font-semibold text-green-600">{sentNotifications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Scheduled</h3>
            <p className="text-2xl font-semibold text-yellow-600">{scheduledNotifications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Failed</h3>
            <p className="text-2xl font-semibold text-red-600">{failedNotifications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Push Notifications</h3>
            <p className="text-2xl font-semibold text-blue-600">{pushNotifications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Emails Sent</h3>
            <p className="text-2xl font-semibold text-orange-600">{emailNotifications.length}</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search by title, message, user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    {/* <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setChannelFilter("all");
                    setDateRange("total");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {notifications.length} of {totalNotifications} notifications
                {` - Page ${currentPage} of ${totalPages}`}
              </div>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications History</CardTitle>
            <CardDescription>
              All platform notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
           <div className="space-y-4">
              {notifications.map((notification: any) => (
                <div key={notification.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {renderTypeBadge(notification.type)}
                        {renderStatusBadge(notification.status)}
                        {notification.is_urgent && (
                          <Badge className="bg-red-100 text-red-800">🚨 URGENT</Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
                      
                      {/* UPDATED: Use the same parseMarkdown function as NotificationBell */}
                      <div 
                        className="text-gray-600 mt-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: parseMarkdown(notification.message) 
                        }}
                      />
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>To: {notification.target_audience}</span>
                        {notification.target_audience === "specific_users" && notification.stats?.users_notified && (
                          <span>Users: {notification.stats.users_notified.length} selected</span>
                        )}
                        <span>Channels: {renderChannels(notification.channels)}</span>
                        <span>Created: {new Date(notification.created_at).toLocaleString()}</span>
                        {notification.scheduled_for && (
                          <span>Scheduled: {new Date(notification.scheduled_for).toLocaleString()}</span>
                        )}
                        {notification.sent_at && (
                          <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                        )}
                      </div>

                      {/* Delivery Stats */}
                      {notification.stats && (
                        <div className="flex items-center space-x-4 mt-2 text-xs">
                          <span>📱 In-App: {notification.stats.in_app_sent || 0}</span>
                          <span>📧 Email: {notification.stats.email_sent || 0}</span>
                          {/* <span>💬 SMS: {notification.stats.sms_sent || 0}</span>
                          <span>🔔 Push: {notification.stats.push_sent || 0}</span> */}
                          <span>✅ Successful: {notification.stats.successful || 0}</span>
                          <span>❌ Failed: {notification.stats.failed || 0}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {notification.status === "scheduled" && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleSendNow(notification.id)}
                          >
                            Send Now
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancel(notification.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {notification.status === "draft" && (
                        <Button size="sm">
                          Edit
                        </Button>
                      )}
                      {notification.status === "failed" && (
                        <Button 
                          size="sm"
                          onClick={() => handleSendNow(notification.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-lg font-semibold">No notifications found</h3>
                  <p className="text-gray-600">Create your first notification to get started</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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

                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === currentPage}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Notification Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Create New Notification</CardTitle>
                <CardDescription>
                  Send alerts to users via multiple channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <Input
                    placeholder="Notification title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Message *</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? '✏️ Edit' : '👁️ Preview'}
                    </Button>
                  </div>
                  
                  {/* Formatting Toolbar - Only show when not in preview mode */}
                  {!showPreview && (
                    <>
                      <div className="flex flex-wrap gap-1 mb-2 p-2 border rounded-md bg-gray-50">
                        {/* Text Formatting */}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyFormatting("**")}
                          title="Bold"
                        >
                          <strong>B</strong>
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyFormatting("*")}
                          title="Italic"
                        >
                          <em>I</em>
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyFormatting("~~")}
                          title="Strikethrough"
                        >
                          <s>S</s>
                        </Button>
                        
                        {/* Headers */}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyHeader(1)}
                          title="Header 1"
                        >
                          H1
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyHeader(2)}
                          title="Header 2"
                        >
                          H2
                        </Button>
                        
                        {/* URL */}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          title="Insert Link"
                        >
                          🔗
                        </Button>
                        
                        {/* Emojis */}
                        <div className="relative" ref={emojiPickerRef}>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            title="Insert Emoji"
                          >
                            😀
                          </Button>
                          {showEmojiPicker && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-md shadow-lg z-20 grid grid-cols-6 gap-1 w-48 max-h-48 overflow-y-auto">
                              {[
                                '😀', '😃', '😄', '😁', '😆', '😅',
                                '😂', '🤣', '😊', '😇', '🙂', '🙃',
                                '😉', '😌', '😍', '🥰', '😘', '😗',
                                '😙', '😚', '😋', '😛', '😝', '😜',
                                '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
                                '🥳', '😏', '😒', '😞', '😔', '😟',
                                '😕', '🙁', '☹️', '😣', '😖', '😫',
                                '😩', '🥺', '😢', '😭', '😤', '😠',
                                '😡', '🤬', '🤯', '😳', '🥵', '🥶',
                                '😱', '😨', '😰', '😥', '😓', '🤗',
                                '🤔', '🤭', '🤫', '🤥', '😶', '😐',
                                '😑', '😬', '🙄', '😯', '😦', '😧',
                                '😮', '😲', '🥱', '😴', '🤤', '😪',
                                '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
                                '😷', '🤒', '🤕', '🤑', '🤠', '😈',
                                '👿', '👹', '👺', '🤡', '💩', '👻',
                                '💀', '☠️', '👽', '👾', '🤖', '🎃',
                                '😺', '😸', '😹', '😻', '😼', '😽',
                                '🙀', '😿', '😾'
                              ].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="p-1 hover:bg-gray-100 rounded text-lg"
                                  onClick={() => insertEmoji(emoji)}
                                  title={`Insert ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Image Upload */}
                        {/* <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="image-upload"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            title="Upload Image"
                          >
                            🖼️
                          </Button>
                        </div> */}
                      </div>

                      {/* URL Input Dialog */}
                      {showUrlInput && (
                        <div className="mb-2 p-3 border rounded-md bg-blue-50">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <Input
                              placeholder="Link text"
                              value={urlText}
                              onChange={(e) => setUrlText(e.target.value)}
                            />
                            <Input
                              placeholder="URL"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowUrlInput(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={insertUrl}
                            >
                              Insert Link
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Message Input / Preview */}
                  {showPreview ? (
                    <div className="border rounded-md p-4 bg-gray-50 min-h-[140px]">
                      <h4 className="text-sm font-medium mb-2 text-gray-700">Preview:</h4>
                      {newNotification.message ? (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: parseMarkdown(newNotification.message) 
                          }} 
                        />
                      ) : (
                        <p className="text-gray-500 italic">No message to preview</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <Textarea
                        ref={textareaRef}
                        placeholder="Enter your notification message (supports Markdown formatting)"
                        value={newNotification.message}
                        onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                        rows={4}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Supports basic Markdown: **bold**, *italic*, ~~strikethrough~~, # Header 1, ## Header 2, [link text](url)
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <Select 
                      value={newNotification.type} 
                      onValueChange={(value) => setNewNotification({...newNotification, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="contract">Contract Update</SelectItem>
                        <SelectItem value="wallet">Wallet Alert</SelectItem>
                        <SelectItem value="transaction">Transaction Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Target Audience</label>
                    <Select 
                      value={newNotification.target_audience} 
                      onValueChange={(value) => setNewNotification({...newNotification, target_audience: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_users">All Users</SelectItem>
                        <SelectItem value="premium_users">Premium Users</SelectItem>
                        <SelectItem value="new_users">New Users</SelectItem>
                        <SelectItem value="inactive_users">Inactive Users</SelectItem>
                        <SelectItem value="specific_users">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Specific Users Selection */}
                {newNotification.target_audience === "specific_users" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Users *</label>
                    <div className="space-y-3">
                      {/* User Search */}
                      <div className="relative">
                        <Input
                          placeholder="Search users by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                        {(isSearchingUsers || isUsersLoading) && (
                          <div className="absolute right-3 top-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                          </div>
                        )}
                        
                        {userSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {userSuggestions.map((user) => (
                              <div
                                key={user.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                onClick={() => handleAddUser(user)}
                              >
                                <div className="font-medium">
                                  {user.first_name} {user.last_name}
                                </div>
                                <div className="text-sm text-gray-600">{user.email}</div>
                              </div>
                            ))}
                            {userSuggestions.length >= 100 && (
                              <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50">
                                Showing first 100 results. Refine your search for more specific results.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Users */}
                      {selectedUsers.length > 0 && (
                        <div className="border rounded-md p-3 bg-gray-50">
                          <div className="text-sm font-medium mb-2">
                            Selected Users ({selectedUsers.length})
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2 bg-white border rounded"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-sm text-gray-600 truncate">{user.email}</div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveUser(user.id)}
                                  className="ml-2 shrink-0"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedUsers.length === 0 && userSearch && userSuggestions.length === 0 && !isSearchingUsers && (
                        <div className="text-center py-4 text-gray-500 border rounded-md">
                          No users found matching "{userSearch}"
                        </div>
                      )}

                      {selectedUsers.length === 0 && !userSearch && (
                        <div className="text-center py-4 text-gray-500 border rounded-md">
                          Search for users by name or email above
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Channels</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["in_app", "email"].map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newNotification.channels.includes(channel)}
                          onChange={(e) => {
                            const updatedChannels = e.target.checked
                              ? [...newNotification.channels, channel]
                              : newNotification.channels.filter(c => c !== channel);
                            setNewNotification({...newNotification, channels: updatedChannels});
                          }}
                        />
                        <span className="text-sm capitalize">
                          {channel === 'in_app' ? '📱 In-App' :
                           channel === 'email' ? '📧 Email' :
                           channel === 'sms' ? '💬 SMS' : '🔔 Push'
                           }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Schedule For (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={newNotification.scheduled_for}
                      onChange={(e) => setNewNotification({...newNotification, scheduled_for: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newNotification.is_urgent}
                      onCheckedChange={(checked) => setNewNotification({...newNotification, is_urgent: checked})}
                    />
                    <label className="text-sm font-medium">Mark as Urgent</label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedUsers([]);
                      setUserSearch("");
                      setUserSuggestions([]);
                      setShowPreview(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateNotification}
                    disabled={!newNotification.title || !newNotification.message || 
                      (newNotification.target_audience === "specific_users" && selectedUsers.length === 0) ||
                      isSubmitting}
                    className="bg-[#C29307] text-white hover:bg-[#a87e06]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Notification'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


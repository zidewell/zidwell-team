// ReceiptGen.tsx - Update the interfaces
"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import ReceiptList from "./RecieptLIst";
import CreateReceipt from "@/app/components/Receipt-component/CreateReciept";

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Receipt {
  id: string;
  receipt_id: string;
  user_id: string;
  token: string;
  initiator_email: string;
  initiator_phone: string;
  initiator_name: string;
  business_name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  bill_to: string;
  from_name: string;
  issue_date: string;
  customer_note: string;
  payment_for: string;
  payment_method: string;
  subtotal: number;
  total: number;
  status: "draft" | "pending" | "signed";
  signing_link: string;
  verification_code: string;
  receipt_items: ReceiptItem[];
  seller_signature: string | null;
  client_signature: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  metadata: any;
}

interface ReceiptGenProps {
  receipts: Receipt[];
  loading: boolean;
}

export default function ReceiptGen({ receipts, loading }: ReceiptGenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeTab, setActiveTab] = useState("Receipts");

  // Use total instead of calculating from items
  const totalAmount = receipts.reduce((sum, receipt) => {
    return sum + receipt.total;
  }, 0);

  const signedReceipt = receipts.filter(
    (rcp) => rcp.status === "signed"
  ).length;
  const pendingReceipt = receipts.filter(
    (rcp) => rcp.status === "pending"
  ).length;
  const draftReceipt = receipts.filter((rcp) => rcp.status === "draft").length;

  const filteredReceipts = receipts?.filter((receipt) => {
    const title = receipt.client_name || receipt.bill_to || "";
    const status = receipt.status || "";
    const matchesSearch = title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "All" ||
      (selectedStatus === "Signed" && status === "signed") ||
      (selectedStatus === "Pending" && status === "pending") ||
      (selectedStatus === "Draft" && status === "draft");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {activeTab === "Receipts" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Receipts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {receipts.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{totalAmount.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Signed</p>
                <p className="text-2xl font-bold text-green-600">
                  {signedReceipt}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-[#C29307]">
                  {pendingReceipt + draftReceipt}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 mb-4">
          <TabsTrigger value="Receipts">All Receipts</TabsTrigger>
          <TabsTrigger value="create">Create Receipt</TabsTrigger>
        </TabsList>

        <TabsContent value="Receipts" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Search Input */}
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by client name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {["All", "Signed", "Pending", "Draft"].map((status) => (
                    <Button
                      key={status}
                      variant={
                        selectedStatus === status ? "default" : "outline"
                      }
                      size="sm"
                      className="hover:bg-[#C29307] hover:text-white border hover:shadow-xl transition-all duration-300"
                      onClick={() => setSelectedStatus(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>

                {/* New Receipt Button */}
                <div className="w-full sm:w-auto">
                  <Button
                    className="w-full sm:w-auto hover:bg-black bg-[#C29307] hover:shadow-xl transition-all duration-300"
                    onClick={() => setActiveTab("create")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Receipt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipts List */}
          <ReceiptList receipts={filteredReceipts} loading={loading} />
        </TabsContent>

        <TabsContent value="create">
          <CreateReceipt />
        </TabsContent>
      </Tabs>
    </div>
  );
}

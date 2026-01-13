
"use client";

import { useEffect, useState } from "react";
import { Search, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUserContextData } from "@/app/context/userData";
import Swal from "sweetalert2";
import ContractList from "@/app/components/sign-contract-form-component/ContractLIst";

export default function ContractGen({ loading, contracts }: { loading: boolean; contracts: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const router = useRouter();

  const filteredContracts = contracts?.filter((contract) => {
    const title = contract.contract_title || "";
    const status = contract.status || "";
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "All" || status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const signedContracts = contracts.filter((con) => con.status?.toLowerCase() === "signed").length;
  const pendingContracts = contracts.filter((con) => con.status?.toLowerCase() === "pending").length;
  const draftContracts = contracts.filter((con) => con.status?.toLowerCase() === "draft").length;

  return (
    <div className="md:max-w-5xl md:mx-auto">
      <div className="flex items-start space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-[#C29307] hover:bg-white/10 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden md:block">Back</span>
        </Button>

        <div className="mb-4">
          <h1 className="md:text-3xl text-xl font-bold mb-2">Contract Agreement</h1>
          <p className="text-muted-foreground">Manage your contracts, agreements, and legal documents</p>
        </div>
      </div>


        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Contracts</p>
                  <p className="text-2xl font-bold text-gray-900">{contracts.length.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Signed Contracts</p>
                  <p className="text-2xl font-bold text-green-600">{signedContracts}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Pending Contracts</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingContracts}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Draft Contracts</p>
                  <p className="text-2xl font-bold text-blue-600">{draftContracts}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search contracts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {["All", "Signed", "Pending", "Draft"].map((status) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStatus(status)}
                      className={
                        selectedStatus === status
                          ? "bg-[#C29307] hover:bg-[#b28a06] text-white border hover:shadow-xl transition-all duration-300 whitespace-nowrap"
                          : "border hover:shadow-md transition-all duration-300 whitespace-nowrap"
                      }
                    >
                      {status}
                    </Button>
                  ))}
                   <Button
                    onClick={() =>router.push(`/dashboard/services/contract/create-contract-form`)}
                className="bg-[#C29307] hover:bg-[#b28a06] cursor-pointer"
                   
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create New Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <ContractList contracts={filteredContracts} loading={loading} />
        </div>
    
    </div>
  );
}
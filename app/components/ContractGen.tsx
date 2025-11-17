// app/dashboard/services/simple-agreement/page.tsx
"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Eye, Search } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ContractTemplateCard } from "@/app/components/ContractsTemplates";
import { useRouter } from "next/navigation";
import { CreateNewView } from "@/app/components/CreateNewView";
import { useUserContextData } from "@/app/context/userData";
import ContractsPreview from "@/app/components/previews/ContractsPreview";
import Swal from "sweetalert2";
import Loader from "@/app/components/Loader";
import ContractList from "@/app/components/ContractLIst";
import { contractTemplates as allTemplates } from "../dashboard/services/simple-agreement/data/contractTemplates"; 

// Define local interface for the component
interface ContractTemplateType {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

// Use a subset of templates for the UI
const contractTemplates: ContractTemplateType[] = allTemplates.slice(0, 6).map((template:any) => ({
  id: template.id,
  title: template.title,
  description: template.description,
  icon: template.icon,
  category: template.category
}));

export default function ContractGen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("contracts");
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const { userData } = useUserContextData();

  const fetchContracts = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/get-contracts-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch contracts");
      }

      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load contracts. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.email) {
      fetchContracts(userData.email);
    }
  }, [userData]);

  const handleUseTemplate = (templateId: string) => {
    router.push(`/dashboard/services/simple-agreement/contract-editor/${templateId}`);
  };

  const filteredContracts = contracts?.filter((contract) => {
    const title = contract.contract_title || "";
    const status = contract.status || "";
    const matchesSearch = title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "All" || 
      status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const signedContracts = contracts.filter(
    (con) => con.status?.toLowerCase() === "signed"
  ).length;
  
  const pendingContracts = contracts.filter(
    (con) => con.status?.toLowerCase() === "pending"
  ).length;

  const draftContracts = contracts.filter(
    (con) => con.status?.toLowerCase() === "draft"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards - Only show when on contracts tab */}
      {activeTab === "contracts" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Contracts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contracts.length.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Signed Contracts</p>
                <p className="text-2xl font-bold text-green-600">
                  {signedContracts}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Pending Contracts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingContracts}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Draft Contracts</p>
                <p className="text-2xl font-bold text-blue-600">
                  {draftContracts}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">My Contracts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-6">
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
                      variant={
                        selectedStatus === status ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedStatus(status)}
                      className={
                        selectedStatus === status
                          ? `bg-[#C29307] hover:bg-[#b28a06] text-white border hover:shadow-xl transition-all duration-300 whitespace-nowrap`
                          : "border hover:shadow-md transition-all duration-300 whitespace-nowrap"
                      }
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <ContractList 
            contracts={filteredContracts} 
            loading={loading} 
            // onRefresh={() => userData?.email && fetchContracts(userData.email)}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Contract Templates</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Choose from our professionally designed contract templates
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contractTemplates.map((template) => (
                  <ContractTemplateCard
                    key={template.id}
                    template={template}
                    onUseTemplate={handleUseTemplate}
                  />
                ))}
              </div>
              
              {/* Show more templates button */}
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("create")}
                  className="border-[#C29307] text-[#C29307] hover:bg-[#C29307] hover:text-white"
                >
                  View All Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Create New Contract</CardTitle>
              <p className="text-sm text-gray-600">
                Select a template to start creating your contract
              </p>
            </CardHeader>
            <CardContent>
              <CreateNewView onUseTemplate={handleUseTemplate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
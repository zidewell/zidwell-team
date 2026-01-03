"use client";
import DashboardHeader from "@/app/components/dashboard-hearder";
import DashboardSidebar from "@/app/components/dashboard-sidebar";
import SignContractForm from "@/app/components/sign-contract-form-component/SignContractForm";


import React from "react";

const ContractForm = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />

      <div className="lg:ml-64">
        <DashboardHeader />

        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <SignContractForm />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContractForm;

"use client";

import DashboardSidebar from "@/app/components/dashboard-sidebar";
import DashboardHeader from "@/app/components/dashboard-hearder";
import CreateInvoice from "@/app/components/Invoice-components/CreateInvoice";


export default function InvoiceCreate() {

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />

      <div className="lg:ml-62">
        <DashboardHeader />

        <main className="">
          <div className="max-w-6xl mx-auto">
            <CreateInvoice />
          </div>
        </main>
      </div>
    </div>
  );
}

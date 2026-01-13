"use client";

import DashboardHeader from "@/app/components/dashboard-hearder";
import DashboardSidebar from "@/app/components/dashboard-sidebar";

import CreateReceipt from "@/app/components/Receipt-component/CreateReciept";

export default function page() {
  return (
    <div className="min-h-screen bg-gray-50 fade-in">
      <DashboardSidebar />

      <div className="lg:ml-64">
        <DashboardHeader />

        <main className="p-6">
          <div className="md:max-w-5xl md:mx-auto">
            <CreateReceipt />
          </div>
        </main>
      </div>
    </div>
  );
}

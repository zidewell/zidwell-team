"use client";
import DashboardHeader from "@/app/components/dashboard-hearder";
import DashboardSidebar from "@/app/components/dashboard-sidebar";
import ReceiptCta from "@/app/components/Receipt-component/ReceiptCta";
import ReceiptFeature from "@/app/components/Receipt-component/ReceiptFeature";
import ReceiptFooter from "@/app/components/Receipt-component/ReceiptFooter";
import ReceiptGen from "@/app/components/Receipt-component/ReceiptGen";
import ReceiptHero from "@/app/components/Receipt-component/ReceiptHero";
import ReceiptHowItsWork from "@/app/components/Receipt-component/ReceiptHowItsWork";

import { Button } from "@/app/components/ui/button";
import { useUserContextData } from "@/app/context/userData";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function ReceiptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const { userData } = useUserContextData();

  const fetchReceipts = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/receipt/get-receipts-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch receipts");
      }

      const data = await res.json();
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load receipts. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.email) {
      fetchReceipts(userData.email);
    }
  }, [userData]);

  const hasReceipts = receipts.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 fade-in">
      <DashboardSidebar />

      <div className="lg:ml-64">
        <DashboardHeader />

        <main className="p-6">
          <div className="md:max-w-5xl md:mx-auto">
            <div className="flex items-start space-x-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-[#C29307] hover:bg-white/10 text-sm md:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden md:block">Back</span>
              </Button>

              <div className="">
                <h1 className="md:text-3xl text-xl font-bold mb-2 flex items-center gap-3">
                  Receipt Management{" "}
                  <button
                    disabled
                    className="pointer-events-none text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-md"
                  >
                    ₦100
                  </button>
                </h1>
                <p className="text-muted-foreground">
                  Create, manage, and track your receipts
                </p>
              </div>
            </div>

            {!hasReceipts && !loading ? (
              <>
                <ReceiptHero />
                <ReceiptFeature />
                <ReceiptHowItsWork />
                <ReceiptCta />
                <ReceiptFooter />
              </>
            ) : (
              <ReceiptGen receipts={receipts} loading={loading} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
"use client";

import DashboardHeader from '@/app/components/dashboard-hearder'
import DashboardSidebar from '@/app/components/dashboard-sidebar'
import ContractGen from '@/app/components/sign-contract-form-component/ContractGen'
import Features from '@/app/components/smart-contract-components/Features'
import Pricing from '@/app/components/smart-contract-components/Pricing'
import SmartContractHero from '@/app/components/smart-contract-components/SmartContractHero'
import SmartContractStep from '@/app/components/smart-contract-components/SmartContractStep'
import { useUserContextData } from '@/app/context/userData'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

const Page = () => {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const { userData } = useUserContextData();

  const fetchContracts = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/contract/get-contracts-db", {
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

  const hasContracts = contracts.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="lg:ml-64">
        <DashboardHeader />
        
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
        
            {!hasContracts && !loading ? (
              <>
                <SmartContractHero />
                <Features />
                <SmartContractStep />
                <Pricing />
              </>
            ) : (
              <ContractGen contracts={contracts} loading={loading} />
            )}
            
          
          </div>
          <div className="text-sm text-center mt-6">
            Additional services: Contract edits ₦500
          </div>
        </main>
      </div>
    </div>
  )
}

export default Page
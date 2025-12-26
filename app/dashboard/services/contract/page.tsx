"use client"
import DashboardHeader from '@/app/components/dashboard-hearder'
import DashboardSidebar from '@/app/components/dashboard-sidebar'
import Features from '@/app/components/smart-contract-components/Features'
import Pricing from '@/app/components/smart-contract-components/Pricing'
import SmartContractHero from '@/app/components/smart-contract-components/SmartContractHero'
import SmartContractStep from '@/app/components/smart-contract-components/SmartContractStep'

const page = () => {
  return (
    <div className="min-h-screen bg-gray-50">
            <DashboardSidebar />
    
            <div className="lg:ml-64">
              <DashboardHeader />
    
              <main className="p-6">
                <div className="max-w-6xl mx-auto">
                  <SmartContractHero />
                  <Features/>
                  <SmartContractStep/>
                  <Pricing/>
                </div>
              </main>
            </div>
          </div>
  )
}

export default page

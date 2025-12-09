"use client";

import React from 'react'
import ButtonPrimary from './ButtonPrimary'
import ButtonGhost from './ButtonGhost'
import IconDoc from './IconDoc'
import { useRouter } from 'next/navigation';

const SmartContractHero: React.FC = () => {
  const router = useRouter();

  return (
    <header className="bg-white py-16">
      <div className="container mx-auto px-6 md:px-12 lg:px-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="p-3 rounded-full bg-yellow-50 inline-flex">
              <IconDoc />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight font-inter">
            Smart Contracts
            <span className="block text-yellow-600 font-inter">Made Simple</span>
          </h1>

          <p className="mt-4 text-gray-600 font-inter">
            Create, send, and sign professional contracts in minutes. Legally binding, digitally secured,
            effortlessly managed.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <ButtonPrimary
              onClick={() =>
                router.push('/dashboard/services/contract/create-contract-form')
              }
            >
              Create Contract Now
            </ButtonPrimary>

            <ButtonGhost>View Pricing</ButtonGhost>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SmartContractHero;

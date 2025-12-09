import React, { useState } from 'react'
import ButtonPrimary from './ButtonPrimary';
import ButtonGhost from './ButtonGhost';
import { CircleCheck } from 'lucide-react';

const PricingCard: React.FC<{
  title: string,
  desc: string,
  price: string,
  features: string[],
  featured?: boolean
}> = ({ title, desc, price, features, featured }) => {

  const [selected, setSelected] = useState(false);

  return (
    <div className={`p-6 rounded-lg shadow ${featured ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-white border'} `}>
      <h4 className="font-bold text-2xl font-inter">{title}</h4>
      <p className="font-normal text-lg font-inter">{desc}</p>

      <div className="mt-4 text-4xl font-extrabold font-inter">
        {price}
        <span className="text-sm font-normal font-inter">/contracts</span>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-gray-600">
        {features.map((f, i) => (
          <li className="flex gap-1 font-inter" key={i}>
            <CircleCheck color="#fe9a00" /> {f}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {selected ? (
          <ButtonPrimary className='w-[300px]'>Get Started</ButtonPrimary>
        ) : (
          <ButtonGhost>Get Started</ButtonGhost>
        )}
      </div>

      <div
        className="mt-4 cursor-pointer"
        onClick={() => setSelected(!selected)}
      >
        {/* Clickable overlay or area */}
      </div>
    </div>
  );
};

export default PricingCard;

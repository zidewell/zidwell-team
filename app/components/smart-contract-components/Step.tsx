import React from 'react'

const Step: React.FC<{num: string, title: string, desc: string}> = ({num, title, desc}) => (
  <div className="flex flex-col gap-4 items-start">
    <div className="w-12 h-12 flex items-center justify-center rounded-full  text-6xl opacity-20 text-yellow-600 font-bold font-inter">{num}</div>
    <div>
      <h4 className="font-semibold font-inter">{title}</h4>
      <p className="text-sm text-gray-600 font-inter">{desc}</p>
    </div>
  </div>
);

export default Step

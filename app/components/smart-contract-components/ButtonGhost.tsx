import React from 'react'

const ButtonGhost: React.FC<{children: React.ReactNode, className?:string}> = ({children, className}) => (
<button className={`border border-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-50 font-inter ${className}`}>{children}</button>
);

export default ButtonGhost
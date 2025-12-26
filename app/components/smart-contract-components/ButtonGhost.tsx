import React from 'react'
import { Button } from '../ui/button';

const ButtonGhost: React.FC<{children: React.ReactNode, className?:string}> = ({children, className}) => (
<Button className={`border border-gray-200 text-sm bg-[#C29307]`}>{children}</Button>
);

export default ButtonGhost
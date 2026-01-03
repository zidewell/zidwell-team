import React from 'react'

const SignContractInput: React.FC<{ label?: string; placeholder?: string; id:string; value:string; onchange:(e:any)=> void; }> = ({ label, placeholder,id,value,onchange }) => (
    <div>
        {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}
        <input id={id} value={value} onChange={onchange} className="mt-1 w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder={placeholder} />
    </div>
)
export default SignContractInput

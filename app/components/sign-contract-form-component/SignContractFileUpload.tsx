import React from 'react'
import ButtonGhost from '../smart-contract-components/ButtonGhost'

const SignContractFileUpload: React.FC = () => (
<div className="border border-dashed border-gray-200 rounded p-4 text-center">
<img src="/mnt/data/sign-contract-form.PNG" alt="example" className="mx-auto mb-3 max-h-40 object-contain" />
<div className="text-sm text-gray-500 mb-3">Drag and drop a file here, or <span className="text-blue-600">browse</span></div>
<input type="file" className="hidden" />
<div className="flex justify-center">
<ButtonGhost>Upload Document</ButtonGhost>
</div>
</div>
)

export default SignContractFileUpload

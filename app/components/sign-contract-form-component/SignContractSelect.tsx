import React from 'react'
import { Button } from '../ui/button'
import { sampleContracts } from '@/app/data/sampleContracts';
import { toast } from 'sonner';

interface SignContractSelectProps {
  setContractTitle: (title: any) => void;
  setContractContent: (content: any) => void;
}

const SignContractSelect: React.FC<SignContractSelectProps> = ({ setContractTitle, setContractContent }) => {

    const handleLoadSample = (type: keyof typeof sampleContracts) => {
    const sample = sampleContracts[type];
    setContractTitle(sample.title);
    setContractContent(sample.content);
    toast.success(`Loaded ${sample.title} template`);
  };
    return(
        <div className="flex gap-2 mt-2">
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSample("employment")}
        >
            Employment
        </Button>
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSample("service")}
        >
            Service
        </Button>
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSample("loan")}
        >
            Loan
        </Button>
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSample("nda")}
        >
            NDA
        </Button>
    </div>
    )
}
export default SignContractSelect

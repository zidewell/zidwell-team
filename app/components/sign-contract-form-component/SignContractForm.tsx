import FormBody from "./FormBody"
import HowItWorks from "./HowItWorks"

const SignContractForm: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
                <HowItWorks />
                <FormBody />
            </div>
            
        </div>
    )
}

export default SignContractForm;
import FormBody from "./FormBody"
import HowItWorks from "./HowItWorks"

const SignContractForm: React.FC = () => {
    return (
        <div className=" rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          
                <HowItWorks />
                <FormBody />
         
            
        </div>
    )
}

export default SignContractForm;
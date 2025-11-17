
export const getTemplateContent = (
  templateId: string,
  user: any,
  currentDate: string = new Date().toLocaleDateString()
): string => {
  if (!user?.firstName || !user?.lastName) {
    return "Error: Missing user name information.";
  }

  const templateContent: Record<string, string> = {
    "service-agreement": `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on ${currentDate} between:

Client: [CLIENT_NAME]
Address: [CLIENT_ADDRESS]

Service Provider: [PROVIDER_NAME]
Address: [PROVIDER_ADDRESS]

1. SERVICES
The Service Provider agrees to provide the following services:
[DESCRIPTION_OF_SERVICES]

2. COMPENSATION
Total compensation: [AMOUNT]
Payment terms: [PAYMENT_TERMS]

3. TIMELINE
Project start date: [START_DATE]
Expected completion: [END_DATE]

4. TERMS AND CONDITIONS
[ADDITIONAL_TERMS]

Client Signature: ${user.firstName} ${user.lastName}     Date: ${currentDate}
`,

    "employment-contract": `EMPLOYMENT CONTRACT

This Employment Contract is between [COMPANY_NAME] and [EMPLOYEE_NAME].

Position: [JOB_TITLE]
Start Date: [START_DATE]
Salary: [SALARY_AMOUNT]

Job Responsibilities:
[JOB_DESCRIPTION]

Terms of Employment:
[EMPLOYMENT_TERMS]

Employee Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "nda-template": `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("NDA") is entered into between:

Disclosing Party: [DISCLOSER_NAME]
Receiving Party: [RECIPIENT_NAME]

1. CONFIDENTIAL INFORMATION
[DEFINITION_OF_CONFIDENTIAL_INFO]

2. OBLIGATIONS
The Receiving Party agrees to:
- Keep all information confidential
- Not disclose to third parties
- Use information only for agreed purposes

3. DURATION
This agreement remains in effect for [DURATION].

Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "partnership-agreement": `PARTNERSHIP AGREEMENT

This Partnership Agreement is made on ${currentDate} between:

Partner 1: [PARTNER_1_NAME]
Address: [PARTNER_1_ADDRESS]

Partner 2: [PARTNER_2_NAME] 
Address: [PARTNER_2_ADDRESS]

Business Name: [BUSINESS_NAME]
Business Address: [BUSINESS_ADDRESS]

1. PARTNERSHIP DETAILS
Partnership Name: [PARTNERSHIP_NAME]
Business Purpose: [BUSINESS_PURPOSE]
Partnership Duration: [DURATION]

2. CAPITAL CONTRIBUTIONS
Partner 1 Contribution: [PARTNER_1_CONTRIBUTION]
Partner 2 Contribution: [PARTNER_2_CONTRIBUTION]

3. PROFIT SHARING
Profit Distribution: [PROFIT_PERCENTAGE]%

4. MANAGEMENT & AUTHORITY
[MANAGEMENT_DETAILS]

Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "consulting-agreement": `CONSULTING AGREEMENT

This Consulting Agreement is made between:

Consultant: ${user.firstName} ${user.lastName}
Client: [CLIENT_NAME]

1. SERVICES
Consultant will provide: [SERVICES_DESCRIPTION]

2. COMPENSATION
Consulting Fee: [FEE_AMOUNT]
Payment Terms: [PAYMENT_TERMS]

3. TERM
Start Date: [START_DATE]
End Date: [END_DATE]

4. CONFIDENTIALITY
[CONFIDENTIALITY_TERMS]

Consultant Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "freelance-contract": `FREELANCE AGREEMENT

This Freelance Agreement is between:

Freelancer: ${user.firstName} ${user.lastName}
Client: [CLIENT_NAME]

1. SERVICES
Project: [PROJECT_DESCRIPTION]
Deliverables: [DELIVERABLES_LIST]

2. COMPENSATION
Project Fee: [FEE_AMOUNT]
Payment Schedule: [PAYMENT_SCHEDULE]

3. TIMELINE
Start Date: [START_DATE]
Completion Date: [END_DATE]

4. OWNERSHIP
[INTELLECTUAL_PROPERTY_TERMS]

Freelancer Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "lease-agreement": `LEASE AGREEMENT

This Lease Agreement is made between:

Landlord: ${user.firstName} ${user.lastName}
Tenant: [TENANT_NAME]

Property Address: [PROPERTY_ADDRESS]

1. LEASE TERMS
Lease Term: [LEASE_DURATION] months
Start Date: [START_DATE]
End Date: [END_DATE]

2. RENT
Monthly Rent: [RENT_AMOUNT]
Due Date: [RENT_DUE_DATE]

3. SECURITY DEPOSIT
Security Deposit: [DEPOSIT_AMOUNT]

4. UTILITIES
[UTILITIES_RESPONSIBILITY]

Landlord Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "software-license": `SOFTWARE LICENSE AGREEMENT

This Software License Agreement is between:

Licensor: ${user.firstName} ${user.lastName}
Licensee: [LICENSEE_NAME]

Software: [SOFTWARE_NAME]
Version: [VERSION]

1. LICENSE GRANT
License Type: [LICENSE_TYPE]
Usage Rights: [USAGE_RIGHTS]

2. RESTRICTIONS
[USAGE_RESTRICTIONS]

3. SUPPORT & MAINTENANCE
[SUPPORT_TERMS]

Licensor Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "loan-agreement": `LOAN AGREEMENT

This Loan Agreement is between:

Lender: ${user.firstName} ${user.lastName}
Borrower: [BORROWER_NAME]

1. LOAN DETAILS
Principal Amount: [LOAN_AMOUNT]
Interest Rate: [INTEREST_RATE]%
Term: [LOAN_TERM]

2. REPAYMENT
Monthly Payment: [MONTHLY_PAYMENT]
Due Date: [PAYMENT_DUE_DATE]

3. SECURITY
[COLLATERAL_DETAILS]

4. DEFAULT
[DEFAULT_TERMS]

Lender Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`,

    "default": `CONTRACT AGREEMENT

This Agreement is made on ${currentDate} between:

Party A: ${user.firstName} ${user.lastName}
Party B: [OTHER_PARTY_NAME]

1. PURPOSE
[AGREEMENT_PURPOSE]

2. TERMS
[AGREEMENT_TERMS]

3. COMPENSATION
[COMPENSATION_DETAILS]

4. DURATION
[AGREEMENT_DURATION]

Signature: ${user.firstName} ${user.lastName}      Date: ${currentDate}
`
  };

  return templateContent[templateId] || templateContent["default"];
};
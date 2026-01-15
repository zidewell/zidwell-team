import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ContractSigningPage from "@/app/components/sign-contract-form-component/ContractSigningPage"; 

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;

  // Fetch contract from Supabase using the token
  const { data: contractData, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("token", token)
    .single();

  // if (error || !contractData) return notFound();
  console.log("Fetched contract data:", contractData);
  console.log("Contract token:", error);

  // Format contract data for the component
  const contract = {
    id: contractData.id,
    token: contractData.token,
    title: contractData.contract_title || "Untitled Contract",
    content: contractData.contract_text || "",
    status: contractData.status || "pending",
    initiatorName: contractData.initiator_name || "Contract Creator",
    initiatorEmail: contractData.initiator_email || "",
    signeeName: contractData.signee_name || "",
    signeeEmail: contractData.signee_email || "",
    signeePhone: contractData.phone_number || "",
    hasLawyerSignature: contractData.include_lawyer_signature || false,
    creatorName: contractData.creator_name || contractData.initiator_name || "",
    creatorSignature: contractData.creator_signature || null,
    createdAt: contractData.created_at,
    verificationCode: contractData.verification_code,
    signeeSignature: contractData.signee_signature_image || null,
     contractDate: contractData.contract_date || contractData.created_at,
    metadata: contractData.metadata || {},
  };

  return <ContractSigningPage contract={contract} />;
}

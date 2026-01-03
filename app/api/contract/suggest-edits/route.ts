import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractId, contractToken, contractTitle, signeeEmail, suggestedEdits } = body;

    // Store suggested edits
    const { error } = await supabase
      .from("contract_edits")
      .insert([{
        contract_id: contractId,
        contract_token: contractToken,
        contract_title: contractTitle,
        signee_email: signeeEmail,
        suggested_edits: suggestedEdits,
        status: "pending",
        created_at: new Date().toISOString(),
      }]);

    if (error) throw error;

    // Update contract status
    await supabase
      .from("contracts")
      .update({ 
        status: "edits_requested",
        updated_at: new Date().toISOString()
      })
      .eq("id", contractId);

    // In a real app, send email notification to contract creator
    console.log(`Edits suggested for contract ${contractTitle} by ${signeeEmail}`);

    return NextResponse.json({ 
      success: true, 
      message: "Edits submitted successfully" 
    });

  } catch (error: any) {
    console.error("Error in suggest-edits:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
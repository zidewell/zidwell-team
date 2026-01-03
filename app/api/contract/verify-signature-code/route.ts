// app/api/contract/verify-signature-code/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { contractToken, signeeEmail, verificationCode } =
      await request.json();

    if (!contractToken || !signeeEmail || !verificationCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get contract from Supabase
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("token", contractToken)
      .single();

    if (error || !contract) {
      console.error("Contract not found:", error);
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Verify email matches
    if (contract.signee_email !== signeeEmail) {
      return NextResponse.json(
        { error: "Email does not match the contract signee" },
        { status: 403 }
      );
    }

    // Check if verification code exists and is valid
    if (!contract.verification_code) {
      return NextResponse.json(
        { error: "Verification code expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check if code has expired (30 minutes)
    const verificationCodeSentAt = new Date(contract.verification_code_sent_at);
    const now = new Date();
    const minutesElapsed =
      (now.getTime() - verificationCodeSentAt.getTime()) / (1000 * 60);

    if (minutesElapsed > 30) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify the code
    if (contract.verification_code !== verificationCode) {
      // Increment failed attempts
      const failedAttempts = (contract.verification_failed_attempts || 0) + 1;

      await supabase
        .from("contracts")
        .update({
          verification_failed_attempts: failedAttempts,
          last_verification_attempt: new Date().toISOString(),
        })
        .eq("token", contractToken);

      if (failedAttempts >= 5) {
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new code." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful verification
    await supabase
      .from("contracts")
      .update({
        verification_failed_attempts: 0,
        verification_code: null, // Clear the code after successful verification
        verification_code_sent_at: null,
        last_verification_attempt: new Date().toISOString(),
        verification_status: "verified",
      })
      .eq("token", contractToken);

    return NextResponse.json(
      {
        success: true,
        message: "Verification successful",
        data: {
          contractTitle: contract.contract_title,
          signeeName: contract.signee_name || signeeEmail.split("@")[0],
          contractId: contract.token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in contract/verify-signature-code:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

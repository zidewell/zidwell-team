import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { receiptToken, signeeEmail, verificationCode } = body;

    console.log("Verification request:", { receiptToken, verificationCode });

    if (!receiptToken || !verificationCode) {
      return NextResponse.json(
        { success: false, error: "Receipt token and verification code are required" },
        { status: 400 }
      );
    }

    // Get receipt from database
    const { data: receipt, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("token", receiptToken)
      .single();

    if (error || !receipt) {
      console.error("Receipt not found:", error);
      return NextResponse.json(
        { success: false, error: "Receipt not found" },
        { status: 404 }
      );
    }

    console.log("Receipt found, verification code:", receipt.verification_code);
    console.log("Provided code:", verificationCode);

    // Check if verification code matches
    if (receipt.verification_code !== verificationCode) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Check if code is expired (30 minutes expiry)
    const sentAt = new Date(receipt.sent_at || receipt.created_at);
    const now = new Date();
    const timeDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60); // in minutes
    
    if (timeDiff > 30) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      receipt: {
        id: receipt.id,
        receipt_id: receipt.receipt_id,
        business_name: receipt.business_name,
        client_name: receipt.client_name,
        client_email: receipt.client_email,
        total: receipt.total,
      },
    });
  } catch (error: any) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
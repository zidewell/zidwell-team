import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch saved P2P beneficiaries for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const { data: beneficiaries, error } = await supabase
      .from("p2p_beneficiaries")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      beneficiaries: beneficiaries || [],
    });
  } catch (error: any) {
    console.error("Get P2P beneficiaries error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST - Save a new P2P beneficiary
export async function POST(req: Request) {
  try {
    const { 
      userId, 
      walletId, 
      accountNumber, 
      accountName, 
      isDefault = false 
    } = await req.json();

    if (!userId || !walletId || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // If setting as default, remove default from other beneficiaries
    if (isDefault) {
      await supabase
        .from("p2p_beneficiaries")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);
    }

    // Check if beneficiary already exists
    const { data: existingBeneficiary } = await supabase
      .from("p2p_beneficiaries")
      .select("*")
      .eq("user_id", userId)
      .eq("wallet_id", walletId)
      .single();

    if (existingBeneficiary) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This user is already in your beneficiaries list" 
        },
        { status: 400 }
      );
    }

    // Insert new P2P beneficiary
    const { data, error } = await supabase
      .from("p2p_beneficiaries")
      .insert([
        {
          user_id: userId,
          wallet_id: walletId,
          account_number: accountNumber,
          account_name: accountName,
          is_default: isDefault,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, message: "This beneficiary already exists" },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Beneficiary saved successfully",
      beneficiary: data,
    });
  } catch (error: any) {
    console.error("Save P2P beneficiary error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
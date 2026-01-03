import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Contract ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Looking for contract with ID:", id);

    // Try different search strategies
    let contractData = null;
    let queryError = null;

    // Strategy 1: Try to find by UUID (id field)
    const { data: byId, error: error1 } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error1 && byId) {
      console.log("✅ Found contract by UUID");
      contractData = byId;
    } else {
      console.log("❌ Not found by UUID, trying token...");
      
      // Strategy 2: Try to find by token
      const { data: byToken, error: error2 } = await supabase
        .from("contracts")
        .select("*")
        .eq("token", id)
        .maybeSingle();

      if (!error2 && byToken) {
        console.log("✅ Found contract by token");
        contractData = byToken;
      } else {
        queryError = error2 || error1;
      }
    }

    // If no contract found
    if (!contractData) {
      console.log("❌ Contract not found with any strategy");
      return NextResponse.json(
        { 
          message: "Contract not found",
          details: queryError?.message || "No matching records found",
          searchedId: id
        },
        { status: 404 }
      );
    }

    console.log("📄 Contract found:", { 
      id: contractData.id,
      title: contractData.contract_title,
      status: contractData.status 
    });

    return NextResponse.json({ 
      success: true,
      contract: contractData 
    }, { status: 200 });

  } catch (error) {
    console.error("🚨 Unexpected error in get-contract:", error);
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
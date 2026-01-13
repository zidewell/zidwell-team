// app/api/receipt/update-receipt/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    // Parse the request body safely
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    const {
      id,
      initiator_email,
      initiator_name,
      initiator_phone,
      business_name,
      client_name,
      client_email,
      client_phone,
      bill_to,
      from_name,
      issue_date,
      customer_note,
      payment_for,
      payment_method,
      subtotal,
      total,
      status,
      receipt_items,
      seller_signature,
      verification_code,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Receipt ID is required" },
        { status: 400 }
      );
    }

    console.log("Updating receipt:", { id, client_name, total, status });

    // Check if receipt exists
    const { data: existingReceipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("Error fetching existing receipt:", fetchError);
      return NextResponse.json(
        { success: false, message: "Receipt not found" },
        { status: 404 }
      );
    }

    if (existingReceipt.status === "signed") {
      console.log("Editing signed receipt - status will be reset to pending");
    }

    // Prepare update data
    const updateData: any = {
      initiator_email: initiator_email || existingReceipt.initiator_email,
      initiator_name: initiator_name || existingReceipt.initiator_name,
      initiator_phone: initiator_phone || existingReceipt.initiator_phone,
      business_name: business_name || existingReceipt.business_name,
      client_name: client_name || existingReceipt.client_name,
      client_email: client_email || existingReceipt.client_email,
      client_phone: client_phone || existingReceipt.client_phone,
      bill_to: bill_to || existingReceipt.bill_to,
      from_name: from_name || existingReceipt.from_name,
      issue_date: issue_date || existingReceipt.issue_date,
      customer_note: customer_note || existingReceipt.customer_note,
      payment_for: payment_for || existingReceipt.payment_for,
      payment_method: payment_method || existingReceipt.payment_method,
      subtotal: subtotal || existingReceipt.subtotal,
      total: total || existingReceipt.total,
      status: status || existingReceipt.status,
      seller_signature: seller_signature || existingReceipt.seller_signature,
      verification_code: verification_code || existingReceipt.verification_code,
      updated_at: new Date().toISOString(),
      sent_at: null, // Reset sent_at since we're resending
      signed_at: null, // Reset signed_at since editing resets signature
      client_signature: null, // Reset client signature
    };

    // Only update receipt_items if provided
    if (receipt_items !== undefined) {
      updateData.receipt_items = JSON.stringify(receipt_items);
    }

    console.log("Update data:", updateData);

    // Update receipt in Supabase
    const { data: updatedReceipt, error } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || "Failed to update receipt",
          error: error.message 
        },
        { status: 500 }
      );
    }

    // Clear cache for this user
    if (updatedReceipt.initiator_email) {
      let clearedCount = 0;
      
      // Import or recreate cache instance (you can move cache to a shared module)
      const receiptsCache = new Map(); // This should be the same instance as above
      
      for (const [key] of receiptsCache) {
        if (key.startsWith(`receipts_${updatedReceipt.initiator_email.toLowerCase()}`)) {
          receiptsCache.delete(key);
          clearedCount++;
        }
      }
      
      console.log(`🧹 Cleared ${clearedCount} receipts cache entries for ${updatedReceipt.initiator_email}`);
    }

    return NextResponse.json({
      success: true,
      message: "Receipt updated successfully",
      receipt: updatedReceipt,
    });

  } catch (error) {
    console.error("Error updating receipt:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
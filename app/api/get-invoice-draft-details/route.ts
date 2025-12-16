// app/api/get-invoice-draft-details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('draftId');
    const userId = searchParams.get('userId'); 

    if (!draftId) {
      return NextResponse.json(
        { error: "Draft ID is required" },
        { status: 400 }
      );
    }

    // Get the draft invoice with its items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('id', draftId)
      .eq('is_draft', true)
      .single();

    if (error) {
      console.error("Error fetching draft:", error);
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: "Draft not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    // Optional: Verify ownership if userId is provided
    if (userId && invoice.user_id !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to access this draft" },
        { status: 403 }
      );
    }

    // Transform the data to match the form structure
    const transformedDraft = {
      ...invoice,
      // Map items to the expected format
      items: invoice.invoice_items?.map((item: any) => ({
        id: item.id,
        description: item.item_description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total_amount
      })) || [],
      // Add backward compatibility for different field names
      invoice_items: invoice.invoice_items || [],
      client_name: invoice.client_name || invoice.signee_name,
      client_email: invoice.client_email || invoice.signee_email,
      from_name: invoice.from_name || invoice.initiator_name,
      from_email: invoice.from_email || invoice.initiator_email,
      business_name: invoice.business_name || "",
      client_phone: invoice.client_phone || "",
      target_quantity: invoice.target_quantity || 1,
      allow_multiple_payments: invoice.allow_multiple_payments || false,
      payment_type: invoice.payment_type || "single",
      fee_option: invoice.fee_option || "customer",
      redirect_url: invoice.redirect_url || "",
      business_logo: invoice.business_logo || "",
      message: invoice.message || "",
      customer_note: invoice.customer_note || "",
      bill_to: invoice.bill_to || ""
    };

    return NextResponse.json({ 
      success: true, 
      draft: transformedDraft 
    });
  } catch (error: any) {
    console.error("Error fetching draft details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch draft details" },
      { status: 500 }
    );
  }
}
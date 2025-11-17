// app/api/invoice/[id]/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: any }> }
) {
  try {
    const id = (await params).id;

    // Fetch invoice with related items
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        invoice_items (*)
      `)
      .eq("id", id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: any }> }
) {
  try {
    const id = (await params).id;
    const updates = await req.json();

    // Extract invoice items from updates if they exist
    const { invoice_items, ...invoiceUpdates } = updates;

    // Start a transaction to update both invoice and items
    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({
        ...invoiceUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (invoiceError) {
      console.error("Error updating invoice:", invoiceError);
      return NextResponse.json(
        { message: "Failed to update invoice", error: invoiceError.message },
        { status: 500 }
      );
    }

    // Update invoice items if they are provided
    if (invoice_items && Array.isArray(invoice_items)) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", id);

      if (deleteError) {
        console.error("Error deleting old invoice items:", deleteError);
        return NextResponse.json(
          { message: "Failed to update invoice items", error: deleteError.message },
          { status: 500 }
        );
      }

      // Insert new items
      const itemsToInsert = invoice_items.map((item: any) => ({
        invoice_id: id,
        item_description: item.item_description || item.description,
        quantity: item.quantity,
        unit_price: item.unit_price || item.unitPrice,
        total_amount: item.total_amount || item.total,
      }));

      const { error: insertError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (insertError) {
        console.error("Error inserting new invoice items:", insertError);
        return NextResponse.json(
          { message: "Failed to update invoice items", error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ message: "Invoice updated successfully" });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
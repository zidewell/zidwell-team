import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_INVOICES_LIMIT = 10;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Fetch user data including free invoice count
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("free_invoices_left, total_invoices_created")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      console.error("Error fetching user:", fetchError);
      // If user not found, return default values
      return NextResponse.json({
        success: true,
        freeInvoicesLeft: FREE_INVOICES_LIMIT,
        totalInvoicesCreated: 0,
        freeInvoiceLimit: FREE_INVOICES_LIMIT,
        hasFreeInvoices: true,
      });
    }

    // If user doesn't have free_invoices_left field, initialize it
    let freeInvoicesLeft = user.free_invoices_left;
    if (freeInvoicesLeft === null || freeInvoicesLeft === undefined) {
      freeInvoicesLeft = FREE_INVOICES_LIMIT;
      
      // Initialize the field
      await supabase
        .from("users")
        .update({
          free_invoices_left: FREE_INVOICES_LIMIT,
          total_invoices_created: user.total_invoices_created || 0,
        })
        .eq("id", userId);
    }

    const hasFreeInvoices = freeInvoicesLeft > 0;

    return NextResponse.json({
      success: true,
      freeInvoicesLeft: freeInvoicesLeft,
      totalInvoicesCreated: user.total_invoices_created || 0,
      freeInvoiceLimit: FREE_INVOICES_LIMIT,
      hasFreeInvoices: hasFreeInvoices,
    });
  } catch (err: any) {
    console.error("Error checking invoice status:", err);
    return NextResponse.json(
      { 
        success: true, 
        freeInvoicesLeft: FREE_INVOICES_LIMIT,
        totalInvoicesCreated: 0,
        freeInvoiceLimit: FREE_INVOICES_LIMIT,
        hasFreeInvoices: true,
      },
      { status: 200 }
    );
  }
}
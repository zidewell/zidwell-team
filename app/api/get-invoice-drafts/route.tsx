import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get draft invoices with their items
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('user_id', userId)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to match the form structure
    const drafts = invoices?.map(invoice => ({
      ...invoice,
      // Map items to the expected format
      items: invoice.invoice_items?.map((item: any) => ({
        id: item.id,
        description: item.item_description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total_amount
      })) || []
    })) || [];

    return NextResponse.json({ 
      drafts,
      count: drafts.length
    });
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}
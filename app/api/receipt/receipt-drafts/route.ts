import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Create new draft
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.user_id || !body.receipt_id) {
      return NextResponse.json(
        { success: false, error: "User ID and Receipt ID are required" },
        { status: 400 }
      );
    }

    const draftData = {
      token:
        body.token ||
        `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receipt_id: body.receipt_id,
      user_id: body.user_id,
      initiator_email: body.initiator_email,
      initiator_name: body.initiator_name,
      business_name: body.business_name,
      client_name: body.client_name || "",
      client_email: body.client_email || "",
      client_phone: body.client_phone || null,
      bill_to: body.bill_to || null,
      from_name: body.from_name || body.from, // ✅ Use from_name if provided, fallback to from
      issue_date: body.issue_date,
      customer_note: body.customer_note || null,
      payment_for: body.payment_for,
      payment_method: body.payment_method,
      subtotal: body.subtotal || 0,
      total: body.total || 0,
      signing_link: body.signing_link || "",
      verification_code: body.verification_code || null,
      status: "draft",
      receipt_items: body.receipt_items || [],
      seller_signature: body.seller_signature || null, // ✅ ADD THIS LINE
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert new draft
    const { data, error } = await supabase
      .from("receipts")
      .insert([draftData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      draft: data,
      message: "Draft created successfully",
    });
  } catch (error: any) {
    console.error("Error creating draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create draft",
        details: error.details || null,
      },
      { status: 500 }
    );
  }
}

// GET: Fetch drafts for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const draftId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (draftId) {
      // Fetch single draft by ID
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", draftId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        draft: data,
      });
    } else {
      // Fetch all drafts for user
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        drafts: data || [],
        count: data?.length || 0,
      });
    }
  } catch (error: any) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch drafts",
      },
      { status: 500 }
    );
  }
}

// PUT: Update existing draft
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || !body.user_id) {
      return NextResponse.json(
        { success: false, error: "Draft ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check if draft exists and belongs to user
    const { data: existingDraft, error: fetchError } = await supabase
      .from("receipts")
      .select("id")
      .eq("id", body.id)
      .eq("user_id", body.user_id)
      .eq("status", "draft")
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Draft not found or access denied" },
        { status: 404 }
      );
    }

    const updateData = {
      token: body.token,
      receipt_id: body.receipt_id,
      initiator_email: body.initiator_email,
      initiator_name: body.initiator_name,
      business_name: body.business_name,
      client_name: body.client_name || "",
      client_email: body.client_email || "",
      client_phone: body.client_phone || null,
      bill_to: body.bill_to || null,
      from_name: body.from_name || body.from, // ✅ Use from_name if provided, fallback to from
      issue_date: body.issue_date,
      customer_note: body.customer_note || null,
      payment_for: body.payment_for,
      payment_method: body.payment_method,
      subtotal: body.subtotal || 0,
      total: body.total || 0,
      signing_link: body.signing_link || "",
      verification_code: body.verification_code || null,
      receipt_items: body.receipt_items || [],
      seller_signature: body.seller_signature || null, // ✅ ADD THIS LINE
      updated_at: new Date().toISOString(),
    };

    // Update draft
    const { data, error } = await supabase
      .from("receipts")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      draft: data,
      message: "Draft updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update draft",
        details: error.details || null,
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove draft
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!draftId || !userId) {
      return NextResponse.json(
        { success: false, error: "Draft ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check if draft exists and belongs to user
    const { data: existingDraft, error: fetchError } = await supabase
      .from("receipts")
      .select("id")
      .eq("id", draftId)
      .eq("user_id", userId)
      .eq("status", "draft")
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Draft not found or access denied" },
        { status: 404 }
      );
    }

    // Delete draft
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", draftId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete draft",
      },
      { status: 500 }
    );
  }
}

// PATCH: Partially update draft (optional)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id || !body.user_id) {
      return NextResponse.json(
        { success: false, error: "Draft ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check if draft exists and belongs to user
    const { data: existingDraft, error: fetchError } = await supabase
      .from("receipts")
      .select("id")
      .eq("id", body.id)
      .eq("user_id", body.user_id)
      .eq("status", "draft")
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Draft not found or access denied" },
        { status: 404 }
      );
    }

    // Remove id and user_id from update data
    const { id, user_id, ...updateData } = body;

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Partial update
    const { data, error } = await supabase
      .from("receipts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      draft: data,
      message: "Draft partially updated successfully",
    });
  } catch (error: any) {
    console.error("Error partially updating draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update draft",
      },
      { status: 500 }
    );
  }
}
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";

import { transporter } from "@/lib/node-mailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};

    // Handle JSON or FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json();
    }

    const userId = body.userId;
    const contractTitle = body.contract_title || body.contractTitle || "Untitled Contract";
    const contractText = body.contract_content || body.contractContent || body.contract_text || "";
    const receiverEmail = body.receiver_email || body.receiverEmail || body.signee_email || "";
    const receiverName = body.receiver_name || body.receiverName || body.signee_name || "";
    const isDraft = body.is_draft || body.isDraft || false;

    if (!userId) return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });

    const token = uuidv4();
    const baseUrl = process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_BASE_URL;

    const verificationCode = isDraft ? null : Math.floor(100000 + Math.random() * 900000).toString();

    // Optional file handling
    let fileUrl = null;
    const uploadedFile = body.file; // from FormData
    if (uploadedFile && uploadedFile.size) {
      const fileExt = uploadedFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("contracts-files")
        .upload(fileName, uploadedFile.stream(), { contentType: uploadedFile.type });

      if (error) throw error;

      fileUrl = supabase.storage.from("contracts-files").getPublicUrl(fileName).data.publicUrl;
    }

    const contractData: any = {
      user_id: userId,
      token,
      contract_title: contractTitle,
      contract_text: contractText,
      initiator_email: body.initiator_email || body.initiatorEmail || "",
      signee_email: receiverEmail,
      signee_name: receiverName,
      status: isDraft ? "draft" : "pending",
      verification_code: verificationCode,
      signing_link: !isDraft ? `${baseUrl}/sign-contract/${token}` : null,
      is_draft: isDraft,
      metadata: { fileUrl },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert contract
    const { data: result, error: insertError } = await supabase
      .from("contracts")
      .insert([contractData])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: isDraft ? "Draft saved successfully" : "Contract sent successfully",
      contractId: result.id,
      token: result.token,
      signingLink: result.signing_link,
      verificationCode: result.verification_code,
      fileUrl,
      isDraft
    });

  } catch (error: any) {
    console.error("Error processing contract:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// DELETE endpoint for drafts/contracts
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!contractId || !userId) {
      return NextResponse.json(
        { success: false, error: "Contract ID and User ID are required" },
        { status: 400 }
      );
    }

    // Delete the contract
    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Contract deleted successfully"
    });

  } catch (error: any) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for contracts/drafts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const draftOnly = searchParams.get('draftOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("contracts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Filter drafts if requested
    if (draftOnly) {
      query = query.eq("is_draft", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match frontend expectations
    const contracts = data?.map(contract => ({
      id: contract.id,
      // REMOVED: contract_id - use id instead since column doesn't exist
      contract_title: contract.contract_title,
      contract_content: contract.contract_text,
      contract_text: contract.contract_text,
      contract_type: contract.contract_type || "custom",
      receiver_name: contract.signee_name || "",
      receiver_email: contract.signee_email || "",
      signee_name: contract.signee_name || "",
      signee_email: contract.signee_email || "",
      receiver_phone: contract.phone_number || "",
      phone_number: contract.phone_number || "",
      age_consent: contract.age_consent || false,
      terms_consent: contract.terms_consent || false,
      status: contract.status || "draft",
      user_id: contract.user_id,
      token: contract.token,
      verification_code: contract.verification_code,
      created_at: contract.created_at,
      updated_at: contract.updated_at,
      is_draft: contract.is_draft || false
    })) || [];

    return NextResponse.json({
      success: true,
      contracts: contracts,
      drafts: draftOnly ? contracts : [],
      count: contracts.length
    });

  } catch (error: any) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating drafts (auto-save)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Contract draft update payload:", {
      userId: body.userId,
      contractTitle: body.contractTitle || body.contract_title,
      receiverEmail: body.receiverEmail || body.receiver_email || body.signee_email
    });

    // Extract data with multiple possible field names
    const userId = body.userId;
    const contractTitle = body.contract_title || body.contractTitle || "Untitled Contract";
    const contractText = body.contract_content || body.contractContent || body.contract_text || "";
    const receiverEmail = body.receiver_email || body.receiverEmail || body.signee_email || "";
    const receiverName = body.receiver_name || body.receiverName || body.signee_name || "";
    const receiverPhone = body.receiver_phone || body.receiverPhone || body.phone_number || null;
    const ageConsent = body.age_consent || body.ageConsent || false;
    const termsConsent = body.terms_consent || body.termsConsent || false;

    if (!userId || !contractTitle.trim()) {
      return NextResponse.json({
        success: true,
        message: "Skipping auto-save - missing required fields"
      });
    }

    // Check for existing draft with same title and recipient
    let existingDraft = null;
    
    if (receiverEmail) {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", userId)
        .eq("contract_title", contractTitle)
        .eq("signee_email", receiverEmail)
        .eq("is_draft", true)
        .single();
      
      existingDraft = data;
    } else {
      // Check for drafts without recipient (just by title)
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", userId)
        .eq("contract_title", contractTitle)
        .eq("is_draft", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      existingDraft = data;
    }

    if (existingDraft) {
      console.log("Updating existing draft:", existingDraft.id);
      
      // Update existing draft
      const updateData: any = {
        contract_text: contractText,
        age_consent: ageConsent,
        terms_consent: termsConsent,
        signee_name: receiverName || existingDraft.signee_name || "",
        phone_number: receiverPhone || existingDraft.phone_number || null,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", existingDraft.id);

      if (updateError) {
        console.error("Auto-save update error:", updateError);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Auto-save completed",
        isUpdate: true
      });
    } else {
      // Create new draft only if there's enough content
      if (contractTitle.trim() && contractText.trim()) {
        console.log("Creating new draft via auto-save");
        
        const token = uuidv4();
        const contractData: any = {
          user_id: userId,
          token,
          contract_title: contractTitle,
          contract_text: contractText,
          initiator_email: body.initiator_email || body.initiatorEmail || "",
          initiator_name: body.initiator_name || body.initiatorName || "",
          signee_email: receiverEmail,
          signee_name: receiverName,
          phone_number: receiverPhone,
          status: "draft",
          age_consent: ageConsent,
          terms_consent: termsConsent,
          verification_code: null,
          signing_link: null,
          is_draft: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contract_type: "custom",
          metadata: {},
          // REMOVED: contract_id - This column doesn't exist
        };

        const { error: insertError } = await supabase
          .from("contracts")
          .insert([contractData])
          .select()
          .single();

        if (insertError) {
          console.error("Auto-save insert error:", insertError);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Auto-save created new draft',
          isUpdate: false
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Skipping auto-save - insufficient content'
      });
    }
  } catch (error: any) {
    console.error('Error in contract draft auto-save:', error);

    return NextResponse.json({
      success: false,
      message: 'Auto-save failed'
    });
  }
}
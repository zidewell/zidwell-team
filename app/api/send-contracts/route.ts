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
    const body = await req.json();
<<<<<<< HEAD
    console.log("Contract API received payload:", {
      userId: body.userId,
      contractTitle: body.contractTitle || body.contract_title,
      receiverEmail: body.receiverEmail || body.receiver_email || body.signee_email,
      isDraft: body.is_draft || body.isDraft || false
=======
    const { userId, initiatorName, receiverEmail, receiverName,signeePhone, contractText, contractTitle, initiatorEmail, status } =
      body;

    if (
      !receiverEmail ||
      !receiverName ||
      !contractText ||
      !contractTitle ||
      !initiatorEmail ||
      !status ||
      !initiatorName
    ) {
      return new Response(JSON.stringify({ message: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = uuidv4();
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_URL
        : process.env.NEXT_PUBLIC_BASE_URL;
    const signingLink = `${baseUrl}/sign-contract/${token}`;
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // ⬇️ Store in Supabase
    const { error } = await supabase.from("contracts").insert({
      token,
      signee_email: receiverEmail,
      signee_name: receiverName,
      signee_phone: signeePhone,
      initiator_email: initiatorEmail,
      initiator_name: initiatorName,
      contract_text: contractText,
      contract_title: contractTitle,
      signing_link: signingLink,
      status,
      verification_code: verificationCode,
>>>>>>> a0b72e445cae805524ecfbf10c5a51c499e436bc
    });

    // Extract data with multiple possible field names
    const userId = body.userId;
    const initiatorName = body.initiator_name || body.initiatorName || "";
    const receiverEmail = body.receiver_email || body.receiverEmail || body.signee_email || "";
    const receiverName = body.receiver_name || body.receiverName || body.signee_name || "";
    const receiverPhone = body.receiver_phone || body.receiverPhone || body.phone_number || body.signeePhone || null;
    const contractText = body.contract_content || body.contractContent || body.contract_text || "";
    const contractTitle = body.contract_title || body.contractTitle || "Untitled Contract";
    const initiatorEmail = body.initiator_email || body.initiatorEmail || "";
    const status = body.status || "pending";
    const isDraft = body.is_draft || body.isDraft || false;
    const draftId = body.draftId || body.id || null;
    // REMOVED: const contractId = body.contract_id || null; // This column doesn't exist

    // Validation
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!isDraft) {
      // For final sending, validate required fields
      if (!receiverEmail || !receiverName || !contractText || !contractTitle) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Missing required fields",
            details: {
              receiverEmail: !!receiverEmail,
              receiverName: !!receiverName,
              contractText: !!contractText,
              contractTitle: !!contractTitle
            }
          },
          { status: 400 }
        );
      }
    }

    // Generate unique identifiers
    const token = uuidv4();
    const baseUrl = process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_BASE_URL;
    
    const verificationCode = isDraft ? null : Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare contract data - match your database schema EXACTLY
    const contractData: any = {
      user_id: userId,
      token,
      contract_title: contractTitle,
      contract_text: contractText,
      initiator_email: initiatorEmail,
      signee_email: receiverEmail,
      signee_name: receiverName,
      status: isDraft ? "draft" : "pending",
      verification_code: verificationCode,
      initiator_name: initiatorName,
      phone_number: receiverPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_draft: isDraft,
      contract_type: body.contract_type || "custom",
      age_consent: body.age_consent || body.ageConsent || false,
      terms_consent: body.terms_consent || body.termsConsent || false,
      metadata: body.metadata || {},
      // REMOVED: contract_id - This column doesn't exist in your table
    };

    // If not draft, generate signing link
    if (!isDraft) {
      const signingLink = `${baseUrl}/sign-contract/${token}`;
      contractData.signing_link = signingLink;
      contractData.sent_at = new Date().toISOString();
    }

    let result;
    
    if (draftId) {
      console.log("Updating existing draft:", draftId);
      // Update existing draft - REMOVE contract_id from update
      const updateData = { ...contractData };
      delete updateData.contract_id; // Ensure no contract_id in update
      
      const { data, error } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", draftId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Update draft error:", error);
        throw error;
      }
      result = data;
    } else {
      console.log("Creating new contract/draft");
      // Insert new contract - use the exact contractData without contract_id
      const insertData = { ...contractData };
      delete insertData.contract_id; // Ensure no contract_id in insert
      
      const { data, error } = await supabase
        .from("contracts")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Insert contract error:", error);
        throw error;
      }
      result = data;
    }

    console.log("Contract saved successfully:", {
      id: result.id,
      token: result.token,
      isDraft: isDraft,
      hasSigningLink: !!result.signing_link
    });

<<<<<<< HEAD
    // Send email only if not draft
    if (!isDraft && receiverEmail) {
      const signingLink = `${baseUrl}/sign-contract/${token}`;
      
      console.log("Sending contract email to:", receiverEmail);
      
      await transporter.sendMail({
        from: `Zidwell Contracts <${process.env.EMAIL_USER}>`,
        to: receiverEmail,
        subject: `📄 You've been invited to sign: ${contractTitle}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; font-size: 15px; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #C29307 0%, #E8B52A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Contract Signature Request</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">${contractTitle}</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="margin-bottom: 20px;">Hello ${receiverName},</p>
              
              <p style="margin-bottom: 25px;">
                <strong>${initiatorName}</strong> has invited you to review and sign the contract 
                <strong>"${contractTitle}"</strong>.
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #C29307; margin: 25px 0;">
                <p style="margin: 0 0 10px; color: #C29307; font-weight: bold;">
                  🔐 Your Verification Code:
                </p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 10px 0;">
                  ${verificationCode}
                </div>
                <p style="margin: 10px 0 0; font-size: 13px; color: #666;">
                  Required to access and sign the contract
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signingLink}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="display: inline-block; background: linear-gradient(135deg, #C29307 0%, #E8B52A 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(192, 147, 7, 0.3); transition: transform 0.2s;">
                  📝 Review & Sign Contract
                </a>
              </div>
              
              <p style="margin-top: 25px; color: #666;">
                <strong>Or copy and paste this link:</strong><br>
                <a href="${signingLink}" style="color: #C29307; word-break: break-all;">${signingLink}</a>
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #999;">
                <p style="margin: 0;">
                  This is an automated message from Zidwell Contracts.<br>
                  If you believe you received this in error, please ignore this email.
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // Send confirmation to initiator
      await transporter.sendMail({
        from: `Zidwell Contracts <${process.env.EMAIL_USER}>`,
        to: initiatorEmail,
        subject: `✅ Contract Sent: ${contractTitle}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; font-size: 15px;">
            <p>Hello ${initiatorName},</p>
            
            <p>Your contract <strong>"${contractTitle}"</strong> has been successfully sent to:</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="margin: 0;">
                <strong>Recipient:</strong> ${receiverName} (${receiverEmail})<br>
                <strong>Sent:</strong> ${new Date().toLocaleString()}<br>
                <strong>Status:</strong> Pending Signature
              </p>
            </div>
            
            <p>You will be notified when the recipient views and signs the contract.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
              <p style="margin: 0;">
                Need help? Contact our support team at support@zidwell.com
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? "Draft saved successfully" : "Contract sent successfully",
      contractId: result.id, // Use the actual id from database
      token: result.token,
      signingLink: result.signing_link || null,
      verificationCode: result.verification_code,
      isDraft: isDraft
=======
    return new Response(JSON.stringify({ message: "Email sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending signature request:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
>>>>>>> a0b72e445cae805524ecfbf10c5a51c499e436bc
    });

  } catch (error: any) {
    console.error("Error processing contract:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error",
        details: error.details || null
      },
      { status: 500 }
    );
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
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to extract admin user info from cookies
async function getAdminUserInfo(cookieHeader: string) {
  try {
    // Extract access token from cookies
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (!accessTokenMatch) return null;

    const accessToken = accessTokenMatch[1];
    
    // Verify the token and get user info
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user) {
      console.error('Error getting admin user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error extracting admin user info:', error);
    return null;
  }
}

// 📄 GET: Retrieve a single tax filing by ID
export async function GET(  
  req: NextRequest,
  { params }: { params: Promise<{ id: any }> }
) {
  const id = (await params).id;

  const { data, error } = await supabaseAdmin
    .from("tax_filings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 🔄 PATCH: Update a single tax filing status or fields
export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: any }> }
) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const id = (await params).id;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Tax filing ID is required" },
        { status: 400 }
      );
    }

    // Get current filing state for audit log
    const { data: currentFiling, error: fetchError } = await supabaseAdmin
      .from("tax_filings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track update attempt on non-existent filing
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_detail_update_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to update tax filing ${id}: Filing not found`,
        metadata: {
          filingId: id,
          attemptedUpdates: body,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Tax filing not found" }, { status: 404 });
    }

    // Prepare update data with timestamps for specific status changes
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString()
    };

    // Add approval timestamp if status changed to approved
    if (body.status === 'approved' && currentFiling.status !== 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = adminUser?.id;
    }

    // Add rejection timestamp if status changed to rejected
    if (body.status === 'rejected' && currentFiling.status !== 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = adminUser?.id;
    }

    // Add submission timestamp if status changed to submitted
    if (body.status === 'submitted' && currentFiling.status !== 'submitted') {
      updateData.submitted_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("tax_filings")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_detail_update_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to update tax filing ${id}: ${error.message}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          filingType: currentFiling.filing_type,
          attemptedUpdates: body,
          previousStatus: currentFiling.status,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedFiling = data?.[0];

    // 🕵️ AUDIT LOG: Track successful filing update
    const changedFields = Object.keys(body).filter(key => 
      key !== 'updated_at' && key !== 'approved_by' && key !== 'rejected_by'
    );
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_tax_filing_detail",
      resourceType: "TaxFiling",
      resourceId: id,
      description: `Updated tax filing ${id}: ${changedFields.join(', ')}`,
      metadata: {
        filingId: id,
        taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
        companyName: currentFiling.company_name,
        nin: currentFiling.nin,
        filingType: currentFiling.filing_type,
        changedFields,
        previousValues: currentFiling,
        newValues: updatedFiling,
        updatedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for status changes
    if (body.status && body.status !== currentFiling.status) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: `tax_filing_status_${body.status}`,
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Tax filing ${id} status changed from ${currentFiling.status} to ${body.status}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          filingType: currentFiling.filing_type,
          previousStatus: currentFiling.status,
          newStatus: body.status,
          changedBy: adminUser?.email,
          timestamp: new Date().toISOString()
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for approval
    if (body.status === 'approved' && currentFiling.status !== 'approved') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "approve_tax_filing_detail",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Approved tax filing for ${currentFiling.first_name} ${currentFiling.last_name}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          companyName: currentFiling.company_name,
          nin: currentFiling.nin,
          filingType: currentFiling.filing_type,
          approvedBy: adminUser?.email,
          approvalTime: new Date().toISOString(),
          reviewNotes: body.review_notes,
          reviewerComments: body.reviewer_comments
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for rejection
    if (body.status === 'rejected' && currentFiling.status !== 'rejected') {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reject_tax_filing_detail",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Rejected tax filing for ${currentFiling.first_name} ${currentFiling.last_name}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          companyName: currentFiling.company_name,
          nin: currentFiling.nin,
          filingType: currentFiling.filing_type,
          rejectedBy: adminUser?.email,
          rejectionTime: new Date().toISOString(),
          rejectionReason: body.review_notes,
          reviewerComments: body.reviewer_comments
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for document updates
    if (body.documents || body.supporting_documents) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "update_tax_filing_documents",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Updated documents for tax filing ${id}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          documentsAdded: body.documents ? body.documents.length : 0,
          supportingDocumentsAdded: body.supporting_documents ? body.supporting_documents.length : 0,
          updatedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for financial data updates
    if (body.income_amount || body.tax_amount || body.deductions) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "update_tax_filing_financials",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Updated financial data for tax filing ${id}`,
        metadata: {
          filingId: id,
          taxpayerName: `${currentFiling.first_name} ${currentFiling.last_name}`,
          previousIncome: currentFiling.income_amount,
          newIncome: body.income_amount,
          previousTax: currentFiling.tax_amount,
          newTax: body.tax_amount,
          previousDeductions: currentFiling.deductions,
          newDeductions: body.deductions,
          updatedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    return NextResponse.json({ 
      message: "Tax filing updated successfully", 
      data: updatedFiling,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error("Tax filing detail update error:", error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "tax_filing_detail_update_error",
      resourceType: "TaxFiling",
      description: `Unexpected error during tax filing detail update: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🗑️ DELETE: Delete a single tax filing
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: any }> }
) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const id = (await params).id;

    if (!id) {
      return NextResponse.json(
        { error: "Tax filing ID is required" },
        { status: 400 }
      );
    }

    // Get filing before deletion for audit log
    const { data: filing, error: fetchError } = await supabaseAdmin
      .from("tax_filings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      // 🕵️ AUDIT LOG: Track deletion attempt on non-existent filing
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_detail_delete_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to delete tax filing ${id}: Filing not found`,
        metadata: {
          filingId: id,
          error: fetchError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: "Tax filing not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("tax_filings")
      .delete()
      .eq("id", id);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "tax_filing_detail_delete_failed",
        resourceType: "TaxFiling",
        resourceId: id,
        description: `Failed to delete tax filing ${id}: ${error.message}`,
        metadata: {
          filingId: id,
          taxpayerName: `${filing.first_name} ${filing.last_name}`,
          filingType: filing.filing_type,
          filingStatus: filing.status,
          error: error.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful tax filing deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_tax_filing_detail",
      resourceType: "TaxFiling",
      resourceId: id,
      description: `Deleted tax filing for ${filing.first_name} ${filing.last_name} (${filing.filing_type})`,
      metadata: {
        filingId: id,
        taxpayerName: `${filing.first_name} ${filing.last_name}`,
        companyName: filing.company_name,
        nin: filing.nin,
        filingType: filing.filing_type,
        filingStatus: filing.status,
        incomeAmount: filing.income_amount,
        taxAmount: filing.tax_amount,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString(),
        createdAt: filing.created_at,
        taxYear: filing.tax_year
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      message: "Tax filing deleted successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error("Tax filing detail deletion error:", error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);
    
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "tax_filing_detail_delete_error",
      resourceType: "TaxFiling",
      description: `Unexpected error during tax filing detail deletion: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
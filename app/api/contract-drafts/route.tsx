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

    // Get draft contracts - using is_draft column instead of status
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to match the form structure
    const drafts = contracts?.map(contract => ({
      id: contract.id,
      contract_id: contract.id, // Use id as contract_id
      contract_title: contract.contract_title,
      contract_content: contract.contract_text,
      contract_text: contract.contract_text,
      contract_type: contract.contract_type || 'custom',
      receiver_name: contract.signee_name || '',
      receiver_email: contract.signee_email || '',
      signee_name: contract.signee_name || '',
      signee_email: contract.signee_email || '',
      receiver_phone: contract.phone_number?.toString() || '',
      phone_number: contract.phone_number?.toString() || '',
      age_consent: contract.age_consent || false,
      terms_consent: contract.terms_consent || false,
      status: contract.status || 'draft',
      user_id: contract.user_id,
      token: contract.token,
      verification_code: contract.verification_code,
      created_at: contract.created_at,
      updated_at: contract.updated_at
    })) || [];

    return NextResponse.json({ 
      success: true,
      drafts,
      count: drafts.length
    });
  } catch (error: any) {
    console.error('Error fetching contract drafts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch contract drafts' 
      },
      { status: 500 }
    );
  }
}

async function createNewContractDraft(body: any) {
  console.log('Creating new contract draft');
  
  const token = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Prepare the contract data - NO contract_id field
  const contractData = {
    user_id: body.userId,
    token: token,
    contract_title: body.contractTitle || body.contract_title || 'Untitled Contract',
    contract_text: body.contractContent || body.contract_content || '',
    initiator_email: body.initiator_email || body.initiatorEmail || '',
    initiator_name: body.initiator_name || body.initiatorName || '',
    signee_email: body.receiverEmail || body.receiver_email || body.signee_email || '',
    signee_name: body.receiverName || body.receiver_name || body.signee_name || '',
    phone_number: body.receiverPhone || body.receiver_phone || body.phone_number || null,
    status: 'draft',
    age_consent: body.ageConsent || body.age_consent || false,
    terms_consent: body.termsConsent || body.terms_consent || false,
    contract_type: body.contract_type || 'custom',
    verification_code: null, 
    signing_link: null,
    is_draft: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Inserting contract with data:', {
    title: contractData.contract_title,
    hasContent: contractData.contract_text.length > 0,
    hasRecipientEmail: !!contractData.signee_email
  });

  // Insert the contract
  const { data: insertedContract, error: contractError } = await supabase
    .from('contracts')
    .insert([contractData])
    .select()
    .single();

  if (contractError) {
    console.error('Contract insert error:', contractError);
    throw contractError;
  }

  return insertedContract;
}

// POST - Create a new contract draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Contract draft POST payload received:', {
      userId: body.userId,
      contractTitle: body.contractTitle || body.contract_title,
      receiverEmail: body.receiverEmail || body.receiver_email || body.signee_email
    });

    // Validation
    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const contractTitle = body.contractTitle || body.contract_title || 'Untitled Contract';
    if (!contractTitle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contract title is required' },
        { status: 400 }
      );
    }

    const receiverEmail = body.receiverEmail || body.receiver_email || body.signee_email || '';
    
    // Check if a draft with same title and recipient already exists
    if (receiverEmail) {
      const { data: existingDraft } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', body.userId)
        .eq('contract_title', contractTitle)
        .eq('signee_email', receiverEmail)
        .eq('is_draft', true)
        .single();

      if (existingDraft) {
        console.log('Found existing draft, updating...');
        
        // Update existing draft
        const { data: updatedContract, error: updateError } = await supabase
          .from('contracts')
          .update({
            contract_text: body.contractContent || body.contract_content || '',
            age_consent: body.ageConsent || body.age_consent || false,
            terms_consent: body.termsConsent || body.terms_consent || false,
            signee_name: body.receiverName || body.receiver_name || body.signee_name || existingDraft.signee_name || '',
            phone_number: body.receiverPhone || body.receiver_phone || body.phone_number || existingDraft.phone_number || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({ 
          success: true, 
          contractId: updatedContract.id,
          draftId: updatedContract.token,
          message: 'Draft updated successfully',
          isUpdate: true
        });
      }
    }

    // Create new draft if none exists
    const contractData = await createNewContractDraft(body);

    return NextResponse.json({ 
      success: true, 
      contractId: contractData.id,
      draftId: contractData.token,
      message: 'Draft saved successfully',
      isUpdate: false
    });
  } catch (error: any) {
    console.error('Error saving contract draft:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save contract draft' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing contract draft (for auto-save)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('Contract draft PUT payload received:', { 
      userId: body.userId,
      contractTitle: body.contractTitle || body.contract_title,
      receiverEmail: body.receiverEmail || body.receiver_email || body.signee_email
    });

    // Validation
    if (!body.userId) {
      return NextResponse.json(
        { success: true, message: 'Skipping auto-save - User ID missing' }
      );
    }

    const contractTitle = body.contractTitle || body.contract_title || 'Untitled Contract';
    if (!contractTitle.trim()) {
      return NextResponse.json(
        { success: true, message: 'Skipping auto-save - Contract title missing' }
      );
    }

    const receiverEmail = body.receiverEmail || body.receiver_email || body.signee_email || '';
    
    // Check for existing draft with same title and recipient
    let existingDraft = null;
    
    if (receiverEmail) {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', body.userId)
        .eq('contract_title', contractTitle)
        .eq('signee_email', receiverEmail)
        .eq('is_draft', true)
        .single();
      
      existingDraft = data;
    } else {
      // Check for drafts without recipient (just by title)
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', body.userId)
        .eq('contract_title', contractTitle)
        .eq('is_draft', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      existingDraft = data;
    }

    if (existingDraft) {
      console.log('Found existing draft for auto-save, updating...');
      
      // Update existing draft
      const updateData: any = {
        contract_text: body.contractContent || body.contract_content || '',
        age_consent: body.ageConsent || body.age_consent || false,
        terms_consent: body.termsConsent || body.terms_consent || false,
        signee_name: body.receiverName || body.receiver_name || body.signee_name || existingDraft.signee_name || '',
        phone_number: body.receiverPhone || body.receiver_phone || body.phone_number || existingDraft.phone_number || null,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', existingDraft.id);

      if (updateError) {
        console.error('Auto-save update error:', updateError);
        throw updateError;
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Auto-save completed',
        timestamp: new Date().toISOString(),
        isUpdate: true
      });
    } else {
      // Create new draft only if there's enough content
      const hasContent = (body.contractContent || body.contract_content || '').trim().length > 0;
      const hasTitle = contractTitle.trim().length > 0;
      
      if (hasTitle && hasContent) {
        console.log('Creating new draft via auto-save...');
        await createNewContractDraft(body);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Auto-save created new draft',
          timestamp: new Date().toISOString(),
          isUpdate: false
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Skipping auto-save - insufficient content',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Error in contract draft auto-save:', error);
    // Don't throw error for auto-save to avoid interrupting user
    return NextResponse.json({
      success: false,
      message: 'Auto-save failed'
    });
  }
}

// DELETE - Delete contract draft(s)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('id');
    const userId = searchParams.get('userId');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll && userId) {
      // Delete all drafts for user
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('user_id', userId)
        .eq('is_draft', true);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        success: true,
        message: 'All contract drafts deleted'
      });
    }

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Delete single draft
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', draftId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Contract draft deleted'
    });
  } catch (error: any) {
    console.error('Error deleting contract draft:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to delete contract draft' 
      },
      { status: 500 }
    );
  }
}
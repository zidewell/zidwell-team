// app/api/saved-beneficiaries/route.js
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); 

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('save_airtime_beneficiaries')
      .select('*')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    // Order by default first, then creation date
    query = query.order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

    const { data: beneficiaries, error } = await query;

    if (error) {
      console.error('Supabase error fetching beneficiaries:', error);
      return NextResponse.json(
        { success: false, message: 'Error fetching beneficiaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      beneficiaries: beneficiaries?.map(beneficiary => ({
        id: beneficiary.id,
        phoneNumber: beneficiary.phone_number,
        network: beneficiary.network,
        networkName: beneficiary.network_name,
        amount: beneficiary.amount,
        type: beneficiary.type,
        isDefault: beneficiary.is_default,
        createdAt: beneficiary.created_at
      })) || []
    });

  } catch (error) {
    console.error('Error fetching saved beneficiaries:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      phoneNumber,
      network,
      networkName,
      amount,
      type = 'airtime',
      isDefault = false
    } = body;

    // Validation based on type
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (type === 'airtime') {
      if (!phoneNumber || !network) {
        return NextResponse.json(
          { success: false, message: 'Phone number and network are required for airtime beneficiaries' },
          { status: 400 }
        );
      }
    }

    // Check if beneficiary already exists
    let existingQuery = supabase
      .from('save_airtime_beneficiaries')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type);

    if (type === 'airtime') {
      existingQuery = existingQuery
        .eq('phone_number', phoneNumber)
        .eq('network', network);
    }

    const { data: existingBeneficiary, error: existingError } = await existingQuery;

    if (existingError) {
      console.error('Supabase error checking existing beneficiary:', existingError);
    }

    if (existingBeneficiary && existingBeneficiary.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Beneficiary already exists' },
        { status: 409 }
      );
    }

    // If setting as default, remove default from other beneficiaries of same type
    if (isDefault) {
      const { error: updateError } = await supabase
        .from('save_airtime_beneficiaries')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('is_default', true);

      if (updateError) {
        console.error('Supabase error updating default beneficiaries:', updateError);
      }
    }

    // Prepare data for insertion - define all properties at once
    const beneficiaryData: any = {
      user_id: userId,
      type,
      is_default: isDefault,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add type-specific fields
    if (type === 'airtime') {
      beneficiaryData.phone_number = phoneNumber;
      beneficiaryData.network = network;
      beneficiaryData.network_name = networkName;
      beneficiaryData.amount = amount || null; // Store amount if provided
    }

    // Insert new beneficiary
    const { data: newBeneficiary, error: insertError } = await supabase
      .from('save_airtime_beneficiaries')
      .insert(beneficiaryData)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase error inserting beneficiary:', insertError);
      return NextResponse.json(
        { success: false, message: 'Error saving beneficiary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      beneficiary: {
        id: newBeneficiary.id,
        phoneNumber: newBeneficiary.phone_number,
        network: newBeneficiary.network,
        networkName: newBeneficiary.network_name,
        amount: newBeneficiary.amount,
        type: newBeneficiary.type,
        isDefault: newBeneficiary.is_default,
        createdAt: newBeneficiary.created_at
      }
    });

  } catch (error) {
    console.error('Error saving beneficiary:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, isDefault, amount } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, message: 'Beneficiary ID and User ID are required' },
        { status: 400 }
      );
    }

    // If setting as default, remove default from other beneficiaries
    if (isDefault) {
      // First get the beneficiary to know its type
      const { data: beneficiary, error: fetchError } = await supabase
        .from('save_airtime_beneficiaries')
        .select('type')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Supabase error fetching beneficiary:', fetchError);
        return NextResponse.json(
          { success: false, message: 'Beneficiary not found' },
          { status: 404 }
        );
      }

      // Remove default from other beneficiaries of same type
      const { error: updateError } = await supabase
        .from('save_airtime_beneficiaries')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', beneficiary.type)
        .eq('is_default', true);

      if (updateError) {
        console.error('Supabase error updating default beneficiaries:', updateError);
      }
    }

    // Prepare update data
    const updateData: any = { 
      is_default: isDefault, 
      updated_at: new Date().toISOString() 
    };

    // Add amount if provided
    if (amount !== undefined) {
      updateData.amount = amount;
    }

    // Update the beneficiary
    const { data: updatedBeneficiary, error: updateError } = await supabase
      .from('save_airtime_beneficiaries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error updating beneficiary:', updateError);
      return NextResponse.json(
        { success: false, message: 'Beneficiary not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Beneficiary updated successfully',
      beneficiary: {
        id: updatedBeneficiary.id,
        isDefault: updatedBeneficiary.is_default,
        amount: updatedBeneficiary.amount
      }
    });

  } catch (error) {
    console.error('Error updating beneficiary:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, message: 'Beneficiary ID and User ID are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('save_airtime_beneficiaries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting beneficiary:', error);
      return NextResponse.json(
        { success: false, message: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Beneficiary deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting beneficiary:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
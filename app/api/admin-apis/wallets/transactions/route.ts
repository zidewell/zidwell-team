import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Admin authentication using the utility file
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(request.headers);

    const { userId, type, amount, reason, adminNote } = await request.json();

    // 🕵️ AUDIT LOG: Track transaction initiation
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "wallet_transaction_initiated",
      resourceType: "Wallet",
      description: `Initiated ${type} transaction for user ${userId}: ₦${amount}`,
      metadata: {
        userId,
        transactionType: type,
        amount,
        reason,
        adminNote,
        initiatedBy: adminUser?.email,
        initiatedAt: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Validation
    if (!userId || !type || !amount || !reason) {
      // 🕵️ AUDIT LOG: Track validation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_validation_failed",
        resourceType: "Wallet",
        description: `Transaction validation failed: Missing required fields`,
        metadata: {
          userId,
          transactionType: type,
          amount,
          reason,
          missingFields: {
            userId: !userId,
            type: !type,
            amount: !amount,
            reason: !reason
          },
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'credit' && type !== 'debit') {
      // 🕵️ AUDIT LOG: Track invalid transaction type
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_invalid_type",
        resourceType: "Wallet",
        description: `Invalid transaction type: ${type}`,
        metadata: {
          userId,
          transactionType: type,
          amount,
          reason,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      // 🕵️ AUDIT LOG: Track invalid amount
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_invalid_amount",
        resourceType: "Wallet",
        description: `Invalid transaction amount: ₦${amount}`,
        metadata: {
          userId,
          transactionType: type,
          amount,
          reason,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Get current user with wallet_balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, wallet_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // 🕵️ AUDIT LOG: Track user not found
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_user_not_found",
        resourceType: "Wallet",
        resourceId: userId,
        description: `Transaction failed: User ${userId} not found`,
        metadata: {
          userId,
          transactionType: type,
          amount,
          reason,
          error: userError?.message || 'User not found',
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check sufficient balance for debit
    if (type === 'debit' && (user.wallet_balance || 0) < amount) {
      // 🕵️ AUDIT LOG: Track insufficient balance
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_insufficient_balance",
        resourceType: "Wallet",
        resourceId: userId,
        description: `Insufficient balance for debit: ₦${amount} requested, ₦${user.wallet_balance || 0} available`,
        metadata: {
          userId,
          userEmail: user.email,
          transactionType: type,
          amount,
          currentBalance: user.wallet_balance || 0,
          shortfall: amount - (user.wallet_balance || 0),
          reason,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(
        { error: 'Insufficient balance for debit operation' },
        { status: 400 }
      );
    }

    // Calculate new balance
    const balanceBefore = user.wallet_balance || 0;
    const newBalance = type === 'credit' 
      ? balanceBefore + amount
      : balanceBefore - amount;

    const transactionId = `MANUAL_${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Update user's wallet_balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        updated_at: now
      })
      .eq('id', userId);

    if (updateError) {
      // 🕵️ AUDIT LOG: Track balance update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_balance_update_failed",
        resourceType: "Wallet",
        resourceId: userId,
        description: `Failed to update wallet balance for ${user.email}: ${updateError.message}`,
        metadata: {
          userId,
          userEmail: user.email,
          transactionType: type,
          amount,
          balanceBefore,
          newBalance,
          error: updateError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw updateError;
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: type.toUpperCase(),
        amount: amount,
        status: 'COMPLETED',
        reference: transactionId,
        description: reason,
        narration: adminNote || `Manual ${type} by admin`,
        fee: 0,
        total_deduction: 0,
        channel: 'admin_dashboard',
        external_response: {
          adminEmail: adminUser?.email || 'admin@system',
          processedAt: now,
          balanceBefore: balanceBefore,
          balanceAfter: newBalance,
          type: 'manual_admin_adjustment',
          adminNote: adminNote,
          reason: reason
        },
        created_at: now,
      })
      .select()
      .single();

    if (txError) {
      // 🕵️ AUDIT LOG: Track transaction record creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_record_failed",
        resourceType: "Wallet",
        resourceId: userId,
        description: `Failed to create transaction record for ${user.email}: ${txError.message}`,
        metadata: {
          userId,
          userEmail: user.email,
          transactionType: type,
          amount,
          balanceBefore,
          newBalance,
          transactionId,
          error: txError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw txError;
    }

    // 🕵️ AUDIT LOG: Track successful transaction completion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: `wallet_transaction_${type}_completed`,
      resourceType: "Wallet",
      resourceId: userId,
      description: `Successfully ${type}ed ₦${amount.toLocaleString()} for ${user.email}`,
      metadata: {
        userId,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        transactionType: type,
        amount,
        balanceBefore,
        newBalance,
        balanceChange: type === 'credit' ? amount : -amount,
        transactionId: transaction.id,
        reference: transactionId,
        reason,
        adminNote,
        processedBy: adminUser?.email,
        processedAt: now,
        transactionRecord: {
          id: transaction.id,
          reference: transaction.reference,
          status: transaction.status
        }
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for large transactions
    if (amount >= 100000) { // ₦100,000 threshold
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_large_transaction",
        resourceType: "Wallet",
        resourceId: userId,
        description: `Large ${type} transaction processed: ₦${amount.toLocaleString()} for ${user.email}`,
        metadata: {
          userId,
          userEmail: user.email,
          transactionType: type,
          amount,
          balanceBefore,
          newBalance,
          threshold: 100000,
          transactionId: transaction.id,
          processedBy: adminUser?.email,
          flaggedAs: 'large_transaction'
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${type}ed ₦${amount.toLocaleString()}`,
      newBalance: newBalance,
      transactionId: transaction.id,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Transaction API Error:', error);
    
    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "wallet_transaction_unexpected_error",
        resourceType: "Wallet",
        description: `Unexpected error during wallet transaction: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json(
      { error: 'Transaction failed: ' + error.message },
      { status: 500 }
    );
  }
}

// GET: Retrieve transaction history (if needed)
export async function GET(request: NextRequest) {
  try {
    // Admin authentication using the utility file
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof NextResponse) return adminUser;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: transactions, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      page,
      limit
    });

  } catch (error: any) {
    console.error('Transaction History API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history: ' + error.message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { getNombaToken } from "@/lib/nomba";
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache for reconciliation results (longer TTL since it's expensive)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Cache for Nomba balance
let _cachedNomba = { ts: 0, value: 0 };
const NOMBA_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Real Nomba payment gateway service
class NombaPaymentGatewayService {
  async getGatewayBalance(): Promise<number> {
    try {
      const now = Date.now();
      if (now - _cachedNomba.ts < NOMBA_CACHE_TTL) {
        console.log("Using cached Nomba balance");
        return _cachedNomba.value;
      }

      const token = await getNombaToken();
      if (!token) {
        console.warn("No Nomba token available");
        return 0;
      }

      // Validate environment variables
      const nombaUrl = process.env.NOMBA_URL;
      const accountId = process.env.NOMBA_ACCOUNT_ID;
      
      if (!nombaUrl || !accountId) {
        console.error("Missing Nomba environment variables");
        return 0;
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        accountId: accountId,
      };

      const res = await fetch(
        `${nombaUrl}/v1/accounts/balance`,
        {
          method: "GET",
          headers: headers,
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Nomba fetch failed:", res.status, txt);
        return 0;
      }

      const data = await res.json().catch(() => ({}));
      const amount = Number(data?.data?.amount ?? 0);
      _cachedNomba = { ts: now, value: amount };
      console.log(`✅ Nomba gateway balance: ₦${amount.toLocaleString()}`);
      return amount;
    } catch (err) {
      console.error("Error fetching Nomba balance:", err);
      return 0;
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    // Since Nomba API gives the total gateway balance,
    // we need to calculate individual user balances differently
    // This is a simplified approach - you might need to adjust based on your business logic
    
    try {
      // Get user's total successful transactions from your system
      const { data: userTransactions, error } = await supabase
        .from('transactions')
        .select('amount, type, status')
        .eq('user_id', userId)
        .eq('status', 'success');

      if (error) {
        console.error(`Error fetching transactions for user ${userId}:`, error);
        return 0;
      }

      // Calculate user's net balance from transactions
      let userNetBalance = 0;
      userTransactions?.forEach(transaction => {
        if (transaction.type === 'CREDIT') {
          userNetBalance += Number(transaction.amount) || 0;
        } else if (transaction.type === 'DEBIT') {
          userNetBalance -= Number(transaction.amount) || 0;
        }
      });

      return Math.max(0, userNetBalance); // Balance shouldn't be negative
    } catch (error) {
      console.error(`Error calculating gateway balance for user ${userId}:`, error);
      return 0;
    }
  }
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'finance_admin', 'operations_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
    const clientInfo = getClientInfo(request.headers);

    const cacheKey = 'reconciliation:latest';
    
    // 🕵️ AUDIT LOG: Track reconciliation initiation
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "reconciliation_initiated",
      resourceType: "Reconciliation",
      description: `Started financial reconciliation process`,
      metadata: {
        cacheKey,
        cacheSize: cache.size,
        cacheHit: cache.has(cacheKey) && isCacheValid(cache.get(cacheKey).timestamp),
        initiatedBy: adminUser?.email,
        initiatedAt: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Check cache first for reconciliation results
    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log('💰 Cache hit for reconciliation API');
      
      // 🕵️ AUDIT LOG: Track cache hit for reconciliation
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_cache_hit",
        resourceType: "Reconciliation",
        description: `Used cached reconciliation results`,
        metadata: {
          cacheKey,
          cacheAge: Date.now() - cached.timestamp,
          cacheSize: cache.size,
          usedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(cached.data);
    }

    const gatewayService = new NombaPaymentGatewayService();

    // Get all users with wallet_balance from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        wallet_balance
      `)
      .not('wallet_balance', 'is', null);

    if (usersError) {
      // 🕵️ AUDIT LOG: Track user fetch failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_user_fetch_failed",
        resourceType: "Reconciliation",
        description: `Failed to fetch users for reconciliation: ${usersError.message}`,
        metadata: {
          error: usersError.message,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw usersError;
    }

    const discrepancies = [];
    const reconciliationResults = [];
    
    // Get total Nomba gateway balance
    const totalGatewayBalance = await gatewayService.getGatewayBalance();
    let totalCalculatedUserBalances = 0;

    // 🕵️ AUDIT LOG: Track gateway balance retrieval
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "gateway_balance_retrieved",
      resourceType: "Reconciliation",
      description: `Retrieved Nomba gateway balance: ₦${totalGatewayBalance.toLocaleString()}`,
      metadata: {
        gateway: 'Nomba',
        balance: totalGatewayBalance,
        isCached: Date.now() - _cachedNomba.ts < NOMBA_CACHE_TTL,
        retrievedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Check each user's wallet_balance against payment gateway
    for (const user of users || []) {
      try {
        const systemBalance = user.wallet_balance || 0;
        const gatewayUserBalance = await gatewayService.getUserBalance(user.id);
        
        totalCalculatedUserBalances += gatewayUserBalance;

        const difference = gatewayUserBalance - systemBalance;
        const isDiscrepant = Math.abs(difference) > 0.01;

        const result = {
          user_id: user.id,
          user_email: user.email,
          system_balance: systemBalance,
          gateway_balance: gatewayUserBalance,
          difference,
          status: isDiscrepant ? 'DISCREPANCY' : 'OK',
        };

        reconciliationResults.push(result);

        if (isDiscrepant) {
          discrepancies.push(result);
        }

      } catch (error: any) {
        console.error(`Reconciliation failed for user ${user.email}:`, error);
        
        // 🕵️ AUDIT LOG: Track individual user reconciliation failure
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "user_reconciliation_failed",
          resourceType: "Reconciliation",
          resourceId: user.id,
          description: `Reconciliation failed for user ${user.email}`,
          metadata: {
            userId: user.id,
            userEmail: user.email,
            systemBalance: user.wallet_balance || 0,
            error: error.message,
            processedBy: adminUser?.email
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });

        reconciliationResults.push({
          user_id: user.id,
          user_email: user.email,
          system_balance: user.wallet_balance || 0,
          gateway_balance: null,
          difference: null,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    // Calculate overall system vs gateway discrepancy
    const totalSystemBalance = reconciliationResults.reduce((sum, r) => sum + (r.system_balance || 0), 0);
    const overallDifference = totalGatewayBalance - totalSystemBalance;
    const hasOverallDiscrepancy = Math.abs(overallDifference) > 0.01;

    const responseData = {
      success: true,
      checked: users?.length || 0,
      discrepanciesFound: discrepancies.length,
      hasOverallDiscrepancy,
      overallDifference,
      discrepancies,
      summary: {
        totalSystemBalance,
        totalGatewayBalance,
        totalCalculatedUserBalances,
        totalDifference: overallDifference,
        systemVsGatewayMatch: !hasOverallDiscrepancy,
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
      },
      gatewayInfo: {
        name: 'Nomba',
        totalBalance: totalGatewayBalance,
        lastChecked: new Date().toISOString(),
      }
    };

    // Cache the expensive reconciliation result
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    // 🕵️ AUDIT LOG: Track successful reconciliation completion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "reconciliation_completed",
      resourceType: "Reconciliation",
      description: `Reconciliation completed: ${discrepancies.length} discrepancies found in ${users?.length || 0} users`,
      metadata: {
        usersChecked: users?.length || 0,
        discrepanciesFound: discrepancies.length,
        hasOverallDiscrepancy,
        overallDifference,
        totalSystemBalance,
        totalGatewayBalance,
        totalCalculatedUserBalances,
        cacheStored: true,
        cacheKey,
        cacheSize: cache.size,
        processedBy: adminUser?.email,
        completedAt: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Special audit for discrepancies found
    if (discrepancies.length > 0) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_discrepancies_found",
        resourceType: "Reconciliation",
        description: `Financial discrepancies detected: ${discrepancies.length} users with balance mismatches`,
        metadata: {
          discrepanciesCount: discrepancies.length,
          totalDiscrepancyAmount: discrepancies.reduce((sum, d) => sum + (d.difference || 0), 0),
          affectedUsers: discrepancies.map(d => ({
            userId: d.user_id,
            userEmail: d.user_email,
            systemBalance: d.system_balance,
            gatewayBalance: d.gateway_balance,
            difference: d.difference
          })),
          flaggedBy: adminUser?.email,
          severity: discrepancies.length > 10 ? 'HIGH' : discrepancies.length > 5 ? 'MEDIUM' : 'LOW'
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    // Special audit for large overall discrepancy
    if (hasOverallDiscrepancy && Math.abs(overallDifference) >= 10000) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_large_discrepancy",
        resourceType: "Reconciliation",
        description: `Large financial discrepancy detected: ₦${Math.abs(overallDifference).toLocaleString()} difference`,
        metadata: {
          overallDifference,
          totalSystemBalance,
          totalGatewayBalance,
          discrepancyType: overallDifference > 0 ? 'GATEWAY_HIGHER' : 'SYSTEM_HIGHER',
          threshold: 10000,
          severity: 'CRITICAL',
          flaggedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }

    return NextResponse.json({
      ...responseData,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Reconciliation API Error:', error);
    
    // 🕵️ AUDIT LOG: Track reconciliation failure
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_failed",
        resourceType: "Reconciliation",
        description: `Reconciliation process failed: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json(
      { error: 'Reconciliation failed: ' + error.message },
      { status: 500 }
    );
  }
}

// Clear reconciliation cache
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'finance_admin', 'operations_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

    const clientInfo = getClientInfo(request.headers);

    const cacheSizeBefore = cache.size;
    const nombaCacheAge = Date.now() - _cachedNomba.ts;

    // Clear caches
    cache.clear();
    _cachedNomba = { ts: 0, value: 0 }; 

    // 🕵️ AUDIT LOG: Track cache clearance
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "reconciliation_cache_cleared",
      resourceType: "Reconciliation",
      description: `Cleared reconciliation caches (${cacheSizeBefore} entries)`,
      metadata: {
        reconciliationCacheSize: cacheSizeBefore,
        nombaCacheAge,
        clearedBy: adminUser?.email,
        clearedAt: new Date().toISOString(),
        reason: "Manual cache clearance via DELETE request"
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
    
    return NextResponse.json({ 
      message: 'Reconciliation cache cleared',
      clearedBy: adminUser?.email,
      clearedAt: new Date().toISOString(),
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
    
  } catch (error: any) {
    console.error('Clear cache error:', error);
    
    // 🕵️ AUDIT LOG: Track cache clearance failure
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reconciliation_cache_clearance_failed",
        resourceType: "Reconciliation",
        description: `Failed to clear reconciliation cache: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to clear cache: ' + error.message },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to check gateway status
export async function GET(request: NextRequest) {
  try {
     const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'finance_admin', 'operations_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
    const clientInfo = getClientInfo(request.headers);

    const gatewayService = new NombaPaymentGatewayService();
    const gatewayBalance = await gatewayService.getGatewayBalance();

    // 🕵️ AUDIT LOG: Track gateway status check
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "gateway_status_checked",
      resourceType: "Reconciliation",
      description: `Checked Nomba gateway status: ₦${gatewayBalance.toLocaleString()}`,
      metadata: {
        gateway: 'Nomba',
        balance: gatewayBalance,
        lastUpdated: new Date(_cachedNomba.ts).toISOString(),
        isCached: Date.now() - _cachedNomba.ts < NOMBA_CACHE_TTL,
        checkedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({
      gateway: 'Nomba',
      balance: gatewayBalance,
      lastUpdated: new Date(_cachedNomba.ts).toISOString(),
      isCached: Date.now() - _cachedNomba.ts < NOMBA_CACHE_TTL,
      checkedBy: adminUser?.email,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
  } catch (error: any) {
    console.error('Gateway status check error:', error);
    
    // 🕵️ AUDIT LOG: Track gateway status check failure
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "gateway_status_check_failed",
        resourceType: "Reconciliation",
        description: `Failed to check gateway status: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack,
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to check gateway status: ' + error.message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getClientInfo } from '@/lib/audit-log';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache configuration
const CACHE_TTL = 30 * 1000; // 30 seconds
const cache = new Map();

function generateCacheKey(searchParams: URLSearchParams): string {
  return `funding-logs:${searchParams.toString()}`;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

export async function GET(request: NextRequest) {
  try {
  const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
    const clientInfo = getClientInfo(request.headers);
    const { searchParams } = new URL(request.url);
    const cacheKey = generateCacheKey(searchParams);

    // 🕵️ AUDIT LOG: Track funding logs access
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_accessed",
      resourceType: "FundingLogs",
      description: `Accessed funding logs with filters`,
      metadata: {
        cacheKey,
        searchParams: Object.fromEntries(searchParams.entries()),
        cacheSize: cache.size,
        cacheHit: cache.has(cacheKey) && isCacheValid(cache.get(cacheKey).timestamp),
        accessedBy: adminUser?.email,
        accessedAt: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log('💰 Cache hit for funding logs API');
      
      // 🕵️ AUDIT LOG: Track cache hit for funding logs
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_cache_hit",
        resourceType: "FundingLogs",
        description: `Used cached funding logs results`,
        metadata: {
          cacheKey,
          cacheAge: Date.now() - cached.timestamp,
          cacheSize: cache.size,
          searchParams: Object.fromEntries(searchParams.entries()),
          usedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return NextResponse.json(cached.data);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 🕵️ AUDIT LOG: Track database query start
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_query_started",
      resourceType: "FundingLogs",
      description: `Started database query for funding logs`,
      metadata: {
        page,
        limit,
        type,
        search,
        status,
        range: { from, to },
        queryType: "transactions_fetch",
        executedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // First, get the transactions
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .or('description.ilike.%funding%,description.ilike.%deposit%,narration.ilike.%funding%,narration.ilike.%deposit%');

    if (type === 'funding') {
      query = query.eq('type', 'CREDIT');
    } else if (type === 'withdrawal') {
      query = query.eq('type', 'DEBIT');
    }

    // Add search filter
    if (search) {
      query = query.or(`reference.ilike.%${search}%,description.ilike.%${search}%,narration.ilike.%${search}%`);
    }

    // Add status filter
    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }

    // Execute transactions query
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      // 🕵️ AUDIT LOG: Track database query failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_query_failed",
        resourceType: "FundingLogs",
        description: `Database query failed for funding logs: ${error.message}`,
        metadata: {
          error: error.message,
          errorCode: error.code,
          searchParams: Object.fromEntries(searchParams.entries()),
          attemptedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      throw error;
    }

    // 🕵️ AUDIT LOG: Track successful database query
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_query_completed",
      resourceType: "FundingLogs",
      description: `Database query completed: ${logs?.length || 0} logs found`,
      metadata: {
        logsCount: logs?.length || 0,
        totalCount: count || 0,
        page,
        limit,
        searchParams: Object.fromEntries(searchParams.entries()),
        executedBy: adminUser?.email
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    // Get unique user IDs from the transactions
    const userIds = [...new Set(logs?.map(log => log.user_id).filter(Boolean))];
    
    // Fetch user emails in a separate query
    let userEmails: { [key: string]: string } = {};
    
    if (userIds.length > 0) {
      // 🕵️ AUDIT LOG: Track user data fetch
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_user_fetch_started",
        resourceType: "FundingLogs",
        description: `Fetching user emails for ${userIds.length} users`,
        metadata: {
          uniqueUserIds: userIds.length,
          userIds: userIds.slice(0, 10), // Log first 10 IDs for reference
          executedBy: adminUser?.email
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (!usersError && users) {
        // Create a mapping of user_id to email
        users.forEach(user => {
          userEmails[user.id] = user.email;
        });

        // 🕵️ AUDIT LOG: Track successful user data fetch
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "funding_logs_user_fetch_completed",
          resourceType: "FundingLogs",
          description: `User emails fetched successfully: ${users.length} users matched`,
          metadata: {
            usersMatched: users.length,
            usersNotFound: userIds.length - users.length,
            executedBy: adminUser?.email
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      } else if (usersError) {
        // 🕵️ AUDIT LOG: Track user data fetch failure
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "funding_logs_user_fetch_failed",
          resourceType: "FundingLogs",
          description: `Failed to fetch user emails: ${usersError.message}`,
          metadata: {
            error: usersError.message,
            errorCode: usersError.code,
            userIdsCount: userIds.length,
            attemptedBy: adminUser?.email
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      }
    }

    // Format the logs with user emails
    const formattedLogs = logs?.map(log => ({
      id: log.id,
      user_email: userEmails[log.user_id] || 'Unknown',
      type: (log.description?.toLowerCase().includes('funding') || 
             log.narration?.toLowerCase().includes('funding') || 
             log.description?.toLowerCase().includes('deposit')) ? 'funding' : 'withdrawal',
      amount: log.amount,
      gateway: log.channel || 'manual',
      reference_id: log.reference,
      status: log.status?.toLowerCase() || 'unknown',
      created_at: log.created_at,
      metadata: log.external_response,
    })) || [];

    const responseData = {
      logs: formattedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };

    // Cache the response
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    // 🕵️ AUDIT LOG: Track successful funding logs retrieval
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_retrieved",
      resourceType: "FundingLogs",
      description: `Funding logs retrieved successfully: ${formattedLogs.length} logs`,
      metadata: {
        logsReturned: formattedLogs.length,
        totalAvailable: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        cacheStored: true,
        cacheKey,
        cacheSize: cache.size,
        processedBy: adminUser?.email,
        completedAt: new Date().toISOString()
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({
      ...responseData,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });

  } catch (error: any) {
    console.error('Funding Logs API Error:', error);
    
    // 🕵️ AUDIT LOG: Track funding logs retrieval failure
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_retrieval_failed",
        resourceType: "FundingLogs",
        description: `Failed to retrieve funding logs: ${error.message}`,
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
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

    const clientInfo = getClientInfo(request.headers);

    const cacheSizeBefore = cache.size;

    // Clear cache
    cache.clear();

    // 🕵️ AUDIT LOG: Track funding logs cache clearance
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_cache_cleared",
      resourceType: "FundingLogs",
      description: `Cleared funding logs cache (${cacheSizeBefore} entries)`,
      metadata: {
        cacheSizeBefore,
        clearedBy: adminUser?.email,
        clearedAt: new Date().toISOString(),
        reason: "Manual cache clearance via POST request"
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      message: 'Funding logs cache cleared successfully',
      clearedBy: adminUser?.email,
      clearedAt: new Date().toISOString(),
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
    
  } catch (error: any) {
    console.error('Funding Logs POST Error:', error);
    
    // 🕵️ AUDIT LOG: Track cache clearance failure
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_cache_clearance_failed",
        resourceType: "FundingLogs",
        description: `Failed to clear funding logs cache: ${error.message}`,
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
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint for comprehensive cache management
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;
  
  const allowedRoles = ['super_admin', 'operations_admin', 'finance_admin'];
  if (!allowedRoles.includes(adminUser?.admin_role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
    const clientInfo = getClientInfo(request.headers);

    const cacheSizeBefore = cache.size;

    // Clear cache
    cache.clear();

    // 🕵️ AUDIT LOG: Track funding logs cache clearance via DELETE
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "funding_logs_cache_cleared_via_delete",
      resourceType: "FundingLogs",
      description: `Cleared funding logs cache via DELETE (${cacheSizeBefore} entries)`,
      metadata: {
        cacheSizeBefore,
        method: "DELETE",
        clearedBy: adminUser?.email,
        clearedAt: new Date().toISOString(),
        reason: "Manual cache clearance via DELETE request"
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });

    return NextResponse.json({ 
      message: 'Funding logs cache cleared successfully via DELETE',
      clearedBy: adminUser?.email,
      clearedAt: new Date().toISOString(),
      cacheEntriesCleared: cacheSizeBefore,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true
      }
    });
    
  } catch (error: any) {
    console.error('Funding Logs DELETE Error:', error);
    
    const adminUser = await requireAdmin(request);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(request.headers);
      
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "funding_logs_delete_failed",
        resourceType: "FundingLogs",
        description: `DELETE operation failed for funding logs: ${error.message}`,
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
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
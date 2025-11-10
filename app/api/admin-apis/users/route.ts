// app/api/admin-apis/users/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ENHANCED ADMIN USERS CACHE
const adminUsersCache = new Map();
const ADMIN_USERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface AdminUsersQuery {
  q: string | null;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Cache management functions - NOT EXPORTED
function clearAdminUsersCache(filters?: Partial<AdminUsersQuery>) {
  if (
    filters &&
    (filters.q !== undefined ||
      filters.page ||
      filters.limit ||
      filters.sortBy ||
      filters.sortOrder)
  ) {
    // Clear specific query cache
    const cacheKey = `admin_users_${filters.q || "all"}_${filters.page || 1}_${
      filters.limit || 20
    }_${filters.sortBy || "created_at"}_${filters.sortOrder || "desc"}`;
    const existed = adminUsersCache.delete(cacheKey);

    if (existed) {
      console.log(`🧹 Cleared specific admin users cache: ${cacheKey}`);
    }

    return existed;
  } else {
    // Clear all admin users cache (including pending count)
    const count = adminUsersCache.size;
    adminUsersCache.clear();
    console.log(`🧹 Cleared all admin users cache (${count} entries)`);
    return count;
  }
}

function clearAdminUsersCacheForUser(userId: string) {
  // When a user is updated, clear all cache since user might appear in different pages/searches
  const count = adminUsersCache.size;
  adminUsersCache.clear();
  console.log(
    `🧹 Cleared all admin users cache due to user ${userId} update (${count} entries)`
  );
  return count;
}

// Clear only pending users count cache
function clearPendingUsersCountCache() {
  const cacheKey = "admin_users_pending_count";
  const existed = adminUsersCache.delete(cacheKey);

  if (existed) {
    console.log(`🧹 Cleared pending users count cache`);
  }

  return existed;
}

async function getCachedAdminUsers({
  q,
  page,
  limit = 20,
  sortBy = "created_at",
  sortOrder = "desc",
}: AdminUsersQuery) {
  const cacheKey = `admin_users_${
    q || "all"
  }_${page}_${limit}_${sortBy}_${sortOrder}`;
  const cached = adminUsersCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ADMIN_USERS_CACHE_TTL) {
    console.log("✅ Using cached admin users data");
    return {
      ...cached.data,
      _fromCache: true,
    };
  }

  console.log("🔄 Fetching fresh admin users data from database");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // ✅ Fetch regular users
  let usersQuery = supabaseAdmin
    .from("users")
    .select("*", { count: "exact" })
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  // ✅ Add search if `q` is provided
  if (q) {
    usersQuery = usersQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const {
    data: usersData,
    error: usersError,
    count: usersCount,
  } = await usersQuery;

  if (usersError) {
    throw new Error(`Users fetch error: ${usersError.message}`);
  }

  // ✅ Get pending users count (cached separately for better performance)
  let pendingCount = 0;
  try {
    const pendingCacheKey = "admin_users_pending_count";
    const pendingCached = adminUsersCache.get(pendingCacheKey);

    if (
      pendingCached &&
      Date.now() - pendingCached.timestamp < ADMIN_USERS_CACHE_TTL
    ) {
      pendingCount = pendingCached.data;
    } else {
      const { count: freshPendingCount, error: pendingError } =
        await supabaseAdmin
          .from("pending_users")
          .select("*", { count: "exact", head: true });

      if (!pendingError) {
        pendingCount = freshPendingCount || 0;
        adminUsersCache.set(pendingCacheKey, {
          data: pendingCount,
          timestamp: Date.now(),
        });
      }
    }
  } catch (pendingErr) {
    console.error("❌ Pending users count error:", pendingErr);
    // Continue without pending count
  }

  const responseData = {
    users: usersData || [],
    total: usersCount || 0,
    page,
    perPage: limit,
    stats: {
      active: usersCount || 0,
      pending: pendingCount || 0,
      total: (usersCount || 0) + pendingCount,
    },
    search: q || null,
    sort: {
      by: sortBy,
      order: sortOrder,
    },
    _fromCache: false,
  };

  // Cache the successful response
  adminUsersCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now(),
  });

  console.log(
    `✅ Cached ${usersData?.length || 0} admin users for page ${page}`
  );

  return responseData;
}

// ✅ GET: Fetch paginated users with optional search
export async function GET(req: Request) {
  try {
    // Admin authentication using the utility file
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
    const nocache = url.searchParams.get("nocache") === "true";

    // Clear cache if force refresh requested
    if (nocache) {
      clearAdminUsersCache({ q, page, limit, sortBy, sortOrder });
      console.log(`🔄 Force refreshing admin users data`);
    }

    // USE CACHED ADMIN USERS DATA
    const result = await getCachedAdminUsers({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    // Remove cache flag from final response
    const { _fromCache, ...cleanResponse } = result;

    return NextResponse.json({
      ...cleanResponse,
      _cache: {
        cached: _fromCache,
        timestamp: Date.now(),
        search: q,
        page,
        perPage: limit,
        sort: {
          by: sortBy,
          order: sortOrder,
        },
      },
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (err: any) {
    console.error("❌ GET /api/admin-apis/users error:", err.message);

    return NextResponse.json(
      {
        error: err.message.includes("Users fetch error")
          ? "Failed to fetch users"
          : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Admin authentication using the utility file
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(req.headers);

    const userData = await req.json();

    if (!userData.email || !userData.first_name || !userData.last_name) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({
        ...userData,
        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // 🕵️ AUDIT LOG: Track user creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_creation_failed",
        resourceType: "User",
        description: `Failed to create user: ${error.message}`,
        metadata: {
          userData,
          error: error.message,
          attemptedBy: adminUser?.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track successful user creation
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_user",
      resourceType: "User",
      resourceId: data.id,
      description: `Created new user: ${data.email}`,
      metadata: {
        userId: data.id,
        userEmail: data.email,
        userName: `${data.first_name} ${data.last_name}`,
        userRole: data.role,
        createdBy: adminUser?.email,
        creationTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // 🧹 CLEAR CACHE AFTER CREATION
    console.log("🧹 Clearing cache after user creation...");
    clearAdminUsersCache();

    return NextResponse.json({
      user: data,
      message: "User created successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (err: any) {
    console.error("❌ POST /api/admin-apis/users error:", err.message);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(req);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(req.headers);

      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "user_creation_error",
        resourceType: "User",
        description: `Unexpected error during user creation: ${err.message}`,
        metadata: {
          error: err.message,
          stack: err.stack,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    // Admin authentication using the utility file
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const clientInfo = getClientInfo(req.headers);

    const { userIds, updates } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Update data is required" },
        { status: 400 }
      );
    }

    // Get current user states for audit log
    const { data: currentUsers, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, role, status")
      .in("id", userIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: adminUser?.id,
      })
      .in("id", userIds)
      .select();

    if (error) {
      // 🕵️ AUDIT LOG: Track bulk update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "users_bulk_update_failed",
        resourceType: "User",
        description: `Failed to bulk update ${userIds.length} users: ${error.message}`,
        metadata: {
          userIds,
          attemptedUpdates: updates,
          error: error.message,
          attemptedBy: adminUser?.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedUsers = data || [];

    // 🕵️ AUDIT LOG: Track successful bulk update
    const changedFields = Object.keys(updates);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "bulk_update_users",
      resourceType: "User",
      description: `Bulk updated ${
        updatedUsers.length
      } users: ${changedFields.join(", ")}`,
      metadata: {
        userIds,
        userEmails: currentUsers?.map((u) => u.email),
        changedFields,
        previousValues: currentUsers,
        newValues: updatedUsers,
        updatedBy: adminUser?.email,
        affectedCount: updatedUsers.length,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Special audit for role changes
    if (updates.role) {
      const roleChangedUsers =
        currentUsers?.filter((user) => user.role !== updates.role) || [];
      if (roleChangedUsers.length > 0) {
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "bulk_role_change",
          resourceType: "User",
          description: `Changed roles for ${roleChangedUsers.length} users to ${updates.role}`,
          metadata: {
            userIds: roleChangedUsers.map((u) => u.id),
            userEmails: roleChangedUsers.map((u) => u.email),
            previousRoles: roleChangedUsers.map((u) => u.role),
            newRole: updates.role,
            changedBy: adminUser?.email,
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
        });
      }
    }

    // 🧹 CLEAR CACHE AFTER BULK UPDATE
    console.log("🧹 Clearing cache after bulk user update...");
    clearAdminUsersCache();

    return NextResponse.json({
      users: updatedUsers,
      message: `${updatedUsers.length} users updated successfully`,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (err: any) {
    console.error("❌ PATCH /api/admin-apis/users error:", err.message);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const adminUser = await requireAdmin(req);
    if (!(adminUser instanceof NextResponse)) {
      const clientInfo = getClientInfo(req.headers);

      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "users_bulk_update_error",
        resourceType: "User",
        description: `Unexpected error during bulk user update: ${err.message}`,
        metadata: {
          error: err.message,
          stack: err.stack,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

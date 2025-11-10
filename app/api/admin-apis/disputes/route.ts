// app/api/admin-apis/disputes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/admin-auth";
import { request } from "https";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRangeDates(range: string | null) {
  if (!range || range === "total") return null;

  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      return null;
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

// Helper function to extract admin user info from cookies
async function getAdminUserInfo(cookieHeader: string) {
  try {
    // Extract access token from cookies
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (!accessTokenMatch) return null;

    const accessToken = accessTokenMatch[1];

    // Verify the token and get user info
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Error getting admin user:", error);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Error extracting admin user info:", error);
    return null;
  }
}

// GET: List disputes with filters and pagination
export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "support_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const range = url.searchParams.get("range") ?? "total";
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const priority = url.searchParams.get("priority") ?? "";
    const category = url.searchParams.get("category") ?? "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the query
    let query = supabaseAdmin
      .from("dispute_tickets")
      .select(
        `
        *,
        messages:dispute_messages(count),
        attachments:dispute_attachments(*)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(
        `ticket_id.ilike.%${search}%,subject.ilike.%${search}%,user_email.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
    }

    // Apply priority filter
    if (priority) {
      query = query.eq("priority", priority);
    }

    // Apply category filter
    if (category) {
      query = query.eq("category", category);
    }

    // Apply date range filter
    const rangeDates = getRangeDates(range);
    if (rangeDates) {
      query = query
        .gte("created_at", rangeDates.start)
        .lte("created_at", rangeDates.end);
    }

    // Get total count for pagination
    const { data: countData, error: countError, count } = await query;
    const totalCount = count || 0;

    if (countError) {
      console.error("Error counting disputes:", countError);

      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: tickets, error } = await query;

    if (error) {
      console.error("Error fetching paginated disputes:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format response
    const formattedTickets =
      tickets?.map((ticket) => ({
        ...ticket,
        message_count: ticket.messages?.[0]?.count || 0,
      })) || [];

    return NextResponse.json({
      page,
      limit,
      total: totalCount,
      range,
      tickets: formattedTickets,
    });
  } catch (err: any) {
    console.error("Server error (disputes route):", err);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "disputes_list_error",
      resourceType: "Dispute",
      description: `Unexpected error in disputes list: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update ticket status
export async function PATCH(req: NextRequest) {
  try {
    const clientInfo = getClientInfo(req.headers);

    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "support_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id, status, resolution_notes, assigned_to } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both 'id' and 'status' are required." },
        { status: 400 }
      );
    }

    // Get current ticket state for audit log
    const { data: currentTicket, error: fetchError } = await supabaseAdmin
      .from("dispute_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current ticket:", fetchError);

      // 🕵️ AUDIT LOG: Track ticket not found
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_update_failed",
        resourceType: "Dispute",
        resourceId: id,
        description: `Failed to update dispute ${id}: Ticket not found`,
        metadata: {
          ticketId: id,
          attemptedStatus: status,
          error: fetchError.message,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add resolution timestamp if resolved
    if (status === "resolved" && currentTicket.status !== "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }

    // Add closure timestamp if closed
    if (status === "closed" && currentTicket.status !== "closed") {
      updateData.closed_at = new Date().toISOString();
    }

    // Add resolution notes if provided
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }

    // Handle assignment changes
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }

    const { data, error } = await supabaseAdmin
      .from("dispute_tickets")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating dispute ticket:", error);

      // 🕵️ AUDIT LOG: Track update failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_update_failed",
        resourceType: "Dispute",
        resourceId: id,
        description: `Failed to update dispute ${id}: ${error.message}`,
        metadata: {
          ticketId: id,
          ticketSubject: currentTicket.subject,
          attemptedUpdates: updateData,
          previousStatus: currentTicket.status,
          error: error.message,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedTicket = data?.[0];

    // 🕵️ AUDIT LOG: Track successful status update
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_dispute_status",
      resourceType: "Dispute",
      resourceId: id,
      description: `Updated dispute ${id} status from ${currentTicket.status} to ${status}`,
      metadata: {
        ticketId: id,
        ticketSubject: currentTicket.subject,
        userEmail: currentTicket.user_email,
        previousStatus: currentTicket.status,
        newStatus: status,
        resolutionNotes: resolution_notes,
        assignedTo:
          assigned_to !== undefined ? assigned_to : currentTicket.assigned_to,
        priority: currentTicket.priority,
        category: currentTicket.category,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Special audit for resolution
    if (status === "resolved" && currentTicket.status !== "resolved") {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "resolve_dispute",
        resourceType: "Dispute",
        resourceId: id,
        description: `Resolved dispute ${id}: ${currentTicket.subject}`,
        metadata: {
          ticketId: id,
          ticketSubject: currentTicket.subject,
          userEmail: currentTicket.user_email,
          resolutionNotes: resolution_notes,
          resolvedBy: adminUser?.email,
          resolutionTime: new Date().toISOString(),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    // Special audit for closure
    if (status === "closed" && currentTicket.status !== "closed") {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "close_dispute",
        resourceType: "Dispute",
        resourceId: id,
        description: `Closed dispute ${id}: ${currentTicket.subject}`,
        metadata: {
          ticketId: id,
          ticketSubject: currentTicket.subject,
          userEmail: currentTicket.user_email,
          closedBy: adminUser?.email,
          closureTime: new Date().toISOString(),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    // Special audit for assignment changes
    if (
      assigned_to !== undefined &&
      assigned_to !== currentTicket.assigned_to
    ) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "reassign_dispute",
        resourceType: "Dispute",
        resourceId: id,
        description: `Reassigned dispute ${id} from ${
          currentTicket.assigned_to || "unassigned"
        } to ${assigned_to || "unassigned"}`,
        metadata: {
          ticketId: id,
          ticketSubject: currentTicket.subject,
          previousAssignee: currentTicket.assigned_to,
          newAssignee: assigned_to,
          assignedBy: adminUser?.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    return NextResponse.json({
      message: "Ticket status updated",
      data: updatedTicket,
      auditLogged: true,
    });
  } catch (err: any) {
    console.error("Server error (disputes PATCH):", err);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "dispute_update_error",
      resourceType: "Dispute",
      description: `Unexpected error during dispute update: ${err.message}`,
      metadata: {
        error: err.message,
        stack: err.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// POST: Add new dispute message (if you have this endpoint)
export async function POST(req: NextRequest) {
  try {
    const clientInfo = getClientInfo(req.headers);

    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "support_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { ticket_id, message, is_internal, attachments } = await req.json();

    if (!ticket_id || !message) {
      return NextResponse.json(
        { error: "Ticket ID and message are required." },
        { status: 400 }
      );
    }

    // Get ticket info for audit log
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("dispute_tickets")
      .select("subject, status, user_email")
      .eq("id", ticket_id)
      .single();

    if (ticketError) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Insert the message
    const { data, error } = await supabaseAdmin
      .from("dispute_messages")
      .insert({
        ticket_id,
        message,
        is_internal: is_internal || false,
        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding dispute message:", error);

      // 🕵️ AUDIT LOG: Track message failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "dispute_message_failed",
        resourceType: "Dispute",
        resourceId: ticket_id,
        description: `Failed to add message to dispute ${ticket_id}`,
        metadata: {
          ticketId: ticket_id,
          ticketSubject: ticket.subject,
          messageLength: message.length,
          isInternal: is_internal,
          error: error.message,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🕵️ AUDIT LOG: Track message addition
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: is_internal ? "add_internal_note" : "add_dispute_message",
      resourceType: "Dispute",
      resourceId: ticket_id,
      description: `Added ${
        is_internal ? "internal note" : "message"
      } to dispute ${ticket_id}`,
      metadata: {
        ticketId: ticket_id,
        ticketSubject: ticket.subject,
        userEmail: ticket.user_email,
        messageId: data.id,
        messageLength: message.length,
        isInternal: is_internal,
        attachmentsCount: attachments?.length || 0,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      message: "Message added successfully",
      data,
      auditLogged: true,
    });
  } catch (err: any) {
    console.error("Server error (disputes POST):", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

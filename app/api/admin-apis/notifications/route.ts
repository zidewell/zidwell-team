import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog, getClientInfo } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/admin-auth";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Error getting admin user:", error);
      return null;
    }

    // Get admin user information from USERS table
    const { data: adminUser } = await supabase
      .from("users")
      .select("first_name, last_name, email, admin_role")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: adminUser?.email || user.email,
      first_name: adminUser?.first_name,
      last_name: adminUser?.last_name,
      admin_role: adminUser?.admin_role || user.user_metadata?.role,
    };
  } catch (error) {
    console.error("Error extracting admin user info:", error);
    return null;
  }
}

// Helper function to get sender display name - PRIORITIZE FIRST NAME
function getSenderDisplayName(adminUser: any) {
  // Prioritize first name above all else
  if (adminUser?.first_name) {
    return adminUser.first_name;
  }

  // Extract name from email as fallback
  if (adminUser?.email) {
    const emailName = adminUser.email.split("@")[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return "Zidwell Team";
}

// Markdown parser function for email and in-app notifications
const parseMarkdown = (text: string) => {
  if (!text) return "";

  return (
    text
      // Headers
      .replace(
        /^# (.*$)/gim,
        '<h1 style="font-size: 24px; font-weight: bold; margin: 25px 0 15px 0; color: #333333;">$1</h1>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 style="font-size: 20px; font-weight: bold; margin: 20px 0 12px 0; color: #333333;">$1</h2>'
      )
      .replace(
        /^### (.*$)/gim,
        '<h3 style="font-size: 18px; font-weight: bold; margin: 18px 0 10px 0; color: #333333;">$1</h3>'
      )
      // Bold
      .replace(
        /\*\*(.*?)\*\*/gim,
        '<strong style="font-weight: bold;">$1</strong>'
      )
      // Italic
      .replace(/\*(.*?)\*/gim, '<em style="font-style: italic;">$1</em>')
      // Strikethrough
      .replace(
        /~~(.*?)~~/gim,
        '<s style="text-decoration: line-through;">$1</s>'
      )
      // Links
      .replace(
        /\[([^\[]+)\]\(([^\)]+)\)/gim,
        '<a href="$2" style="color: #C29307; text-decoration: none; font-weight: 500;" target="_blank">$1</a>'
      )
      // Line breaks
      .replace(/\n/gim, "<br>")
      // Image placeholder
      .replace(
        /\[Image: (.*?)\]/gim,
        '<div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #C29307; margin: 15px 0; font-size: 14px; color: #666666;">🖼️ Image: $1</div>'
      )
  );
};

// Updated sendEmailNotification function with first name as sender
async function sendEmailNotification({
  to,
  subject,
  message,
  type = "info",
  adminUser,
}: {
  to: string;
  subject: string;
  message: string;
  type?: string;
  adminUser: any;
}) {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);

    const senderName = getSenderDisplayName(adminUser);
    const signatureName =
      senderName !== "Zidwell Team" ? senderName : "Zidwell Team";

    const mailOptions = {
      from: `Zidwell" <info@zidwell.com>`,
      to,
      subject: `🔔 ${subject}`,
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: Arial, Helvetica, sans-serif; 
          line-height: 1.6; 
          color: #333333; 
          margin: 0; 
          padding: 0; 
          background-color: #F9F9F9;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #C29307 0%, #a87e06 100%);
          padding: 20px 10px; 
          border-radius: 10px 10px 0 0; 
          margin-bottom: 30px; 
          text-align: center;
          color: white;
        }
        .notification-type { 
          display: inline-block; 
          padding: 10px 20px; 
          border-radius: 20px; 
          font-size: 14px; 
          font-weight: bold; 
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }
        .type-info { background: #dbeafe; color: #1e40af; }
        .type-success { background: #d1fae5; color: #065f46; }
        .type-warning { background: #fef3c7; color: #92400e; }
        .type-error { background: #fee2e2; color: #dc2626; }
        .type-contract { background: #e9d5ff; color: #7e22ce; }
        .type-wallet { background: #fed7aa; color: #ea580c; }
        .type-transaction { background: #c7d2fe; color: #4338ca; }
        .content { 
          background: white; 
          padding: 40px 30px; 
          border-radius: 0 0 10px 10px; 
          border: 1px solid #e5e7eb; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .message-content {
          background: #f8fafc;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #C29307;
          margin: 30px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 30px; 
          border-top: 1px solid #e5e7eb; 
          color: #6b7280; 
          font-size: 14px;
          text-align: center;
        }
        .logo { 
          font-size: 28px; 
          font-weight: bold; 
          margin-bottom: 15px;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .headline {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          line-height: 1.4;
        }
        .subheading {
          font-size: 18px;
          font-weight: bold;
          margin: 25px 0 15px 0;
          color: #333333;
        }
        .zidwell-brand {
          color: #C29307;
          font-weight: bold;
        }
        .support-link {
          color: #C29307;
          text-decoration: none;
          font-weight: 500;
        }
        .support-link:hover {
          text-decoration: underline;
        }
        .paragraph {
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.6;
        }
        .signature {
          margin-top: 30px;
          font-style: italic;
          color: #666666;
        }
       
        /* Markdown element styles */
        .message-content h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 25px 0 15px 0;
          color: #333333;
        }
        .message-content h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0 12px 0;
          color: #333333;
        }
        .message-content h3 {
          font-size: 18px;
          font-weight: bold;
          margin: 18px 0 10px 0;
          color: #333333;
        }
        .message-content strong {
          font-weight: bold;
        }
        .message-content em {
          font-style: italic;
        }
        .message-content s {
          text-decoration: line-through;
        }
        .message-content a {
          color: #C29307;
          text-decoration: none;
          font-weight: 500;
        }
        .message-content a:hover {
          text-decoration: underline;
        }
        @media only screen and (max-width: 600px) {
          .container {
            padding: 15px;
          }
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 15px;
          }
          .logo {
            font-size: 24px;
          }
          .headline {
            font-size: 22px;
          }
          .message-content {
            padding: 20px;
            font-size: 16px;
          }
          .message-content h1 {
            font-size: 22px;
          }
          .message-content h2 {
            font-size: 20px;
          }
          .message-content h3 {
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
        <div class="logo">It's ${senderName} at Zidwell</div>
         
          <hr/>
          <h1 class="headline">${subject}</h1>
        </div>
        
        <div class="content">
          <p class="paragraph">Hello,</p>
          
          <div class="message-content">
            ${parseMarkdown(message)}
          </div>
          
          <p class="paragraph">Thank you for choosing <span class="zidwell-brand">Zidwell</span>.</p>
          
          <div class="signature">
            With love from ${signatureName}
          </div>
        </div>
        
        <div class="footer">
          <p class="paragraph">This is an automated notification from the <span class="zidwell-brand">Zidwell</span> platform.</p>
          <p class="paragraph">If you have any questions, please contact our <a href="mailto:support@zidwell.com" class="support-link">support team</a>.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; line-height: 1.4;">
            &copy; ${new Date().getFullYear()} Zidwell. All rights reserved.<br>
            Empowering your financial journey
          </p>
        </div>
      </div>
    </body>
    </html>

  `,
      text: `Zidwell Notification: ${subject}\n\nFrom: ${senderName}\n\n${message}\n\nThank you for choosing Zidwell.\n\nWith love from ${signatureName}\n\nThis is an automated notification from the Zidwell platform.\nIf you have any questions, please contact our support team at support@zidwell.com.\n\n© ${new Date().getFullYear()} Zidwell. All rights reserved.`,
    };
    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to: ${to}`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

async function sendNotificationToUsers({
  title,
  message,
  type,
  target_audience,
  specific_users = [],
  channels = ["in_app"],
  admin_notification_id,
  adminUser,
}: {
  title: string;
  message: string;
  type: string;
  target_audience: string;
  specific_users?: string[];
  channels?: string[];
  admin_notification_id: string;
  adminUser: any;
}) {
  try {
    console.log("=== START: sendNotificationToUsers ===");
    console.log("Title:", title);
    console.log("Target audience:", target_audience);
    console.log("Channels:", channels);
    console.log("Specific users:", specific_users);
    console.log("Sender:", getSenderDisplayName(adminUser));

    let userQuery = supabase
      .from("users")
      .select("id, email, first_name, last_name, notification_preferences");

    // Handle specific users targeting
    if (target_audience === "specific_users" && specific_users.length > 0) {
      userQuery = userQuery.in("id", specific_users);
    } else {
      // Handle other target audiences
      switch (target_audience) {
        case "premium_users":
          userQuery = userQuery.eq("subscription_tier", "premium");
          break;
        case "new_users":
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          userQuery = userQuery.gte("created_at", thirtyDaysAgo.toISOString());
          break;
        case "inactive_users":
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          userQuery = userQuery.lt("last_login", twoWeeksAgo.toISOString());
          break;
      }
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(
      `Found ${users?.length || 0} users for target: ${target_audience}`
    );

    if (!users || users.length === 0) {
      throw new Error("No users found for the target audience");
    }

    // Track delivery results
    const deliveryResults = {
      in_app: { successful: 0, failed: 0 },
      email: { successful: 0, failed: 0 },
      total: users.length,
    };

    // Create in-app notifications
    if (channels.includes("in_app")) {
      try {
        const notifications = users.map((user) => ({
          user_id: user.id,
          title,
          message, // Store the raw Markdown message
          type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        console.log(`Creating ${notifications.length} in-app notifications...`);

        const { data, error: insertError } = await supabase
          .from("notifications")
          .insert(notifications)
          .select();

        if (insertError) {
          console.error("Error creating in-app notifications:", insertError);
          deliveryResults.in_app.failed = users.length;
        } else {
          console.log(
            `Successfully created ${data?.length || 0} in-app notifications`
          );
          deliveryResults.in_app.successful = data?.length || 0;
          deliveryResults.in_app.failed = users.length - (data?.length || 0);
        }
      } catch (error) {
        console.error("Error in in-app notification creation:", error);
        deliveryResults.in_app.failed = users.length;
      }
    }

    // Send email notifications
    if (channels.includes("email")) {
      console.log(`Sending ${users.length} email notifications...`);

      const emailPromises = users.map(async (user) => {
        try {
          const emailResult = await sendEmailNotification({
            to: user.email,
            subject: title,
            message,
            type,
            adminUser,
          });

          return {
            userId: user.id,
            email: user.email,
            success: emailResult.success,
            error: emailResult.error,
          };
        } catch (error) {
          return {
            userId: user.id,
            email: user.email,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const emailResults = await Promise.all(emailPromises);

      deliveryResults.email.successful = emailResults.filter(
        (r) => r.success
      ).length;
      deliveryResults.email.failed = emailResults.filter(
        (r) => !r.success
      ).length;

      console.log(
        `Email results: ${deliveryResults.email.successful} successful, ${deliveryResults.email.failed} failed`
      );
    }

    // Update admin notification with delivery stats
    await supabase
      .from("admin_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        stats: {
          total_users: users.length,
          successful:
            deliveryResults.in_app.successful +
            deliveryResults.email.successful,
          failed: deliveryResults.in_app.failed + deliveryResults.email.failed,
          in_app_sent: deliveryResults.in_app.successful,
          in_app_failed: deliveryResults.in_app.failed,
          email_sent: deliveryResults.email.successful,
          email_failed: deliveryResults.email.failed,
          users_notified: users.map((u) => ({
            id: u.id,
            email: u.email,
            name: `${u.first_name} ${u.last_name}`,
          })),
          sender_name: getSenderDisplayName(adminUser),
        },
      })
      .eq("id", admin_notification_id);

    console.log("=== END: sendNotificationToUsers - SUCCESS ===");
    return {
      success: true,
      total: users.length,
      successful:
        deliveryResults.in_app.successful + deliveryResults.email.successful,
      failed: deliveryResults.in_app.failed + deliveryResults.email.failed,
      deliveryResults,
      sender: getSenderDisplayName(adminUser),
    };
  } catch (error) {
    console.error("=== END: sendNotificationToUsers - ERROR ===", error);

    await supabase
      .from("admin_notifications")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        sent_at: new Date().toISOString(),
      })
      .eq("id", admin_notification_id);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const clientInfo = getClientInfo(req.headers);

    const body = await req.json();
    const {
      title,
      message,
      type = "info",
      target_audience = "all_users",
      specific_users = [],
      channels = ["in_app"],
      is_urgent = false,
      scheduled_for = null,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Validate specific users selection
    if (
      target_audience === "specific_users" &&
      (!specific_users || specific_users.length === 0)
    ) {
      return NextResponse.json(
        {
          error:
            "At least one user must be selected for specific user notifications",
        },
        { status: 400 }
      );
    }

    // Validate channels
    if (!channels || channels.length === 0) {
      return NextResponse.json(
        { error: "At least one channel must be selected" },
        { status: 400 }
      );
    }

    // 🕵️ AUDIT LOG: Track notification creation attempt
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_bulk_notification",
      resourceType: "Notification",
      description: `Creating bulk notification: "${title}" for ${target_audience}`,
      metadata: {
        title,
        messageLength: message.length,
        type,
        targetAudience: target_audience,
        specificUsersCount: specific_users.length,
        channels,
        isUrgent: is_urgent,
        scheduledFor: scheduled_for,
        createdBy: adminUser?.email,
        senderName: getSenderDisplayName(adminUser),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Prepare notification data
    const notificationData: any = {
      title,
      message,
      type,
      target_audience,
      specific_users: specific_users.length > 0 ? specific_users : [],
      channels,
      is_urgent,
      status: scheduled_for ? "scheduled" : "sending",
      created_by: adminUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields only if they have values
    if (scheduled_for) {
      notificationData.scheduled_for = scheduled_for;
    }

    const { data: notification, error: notifError } = await supabase
      .from("admin_notifications")
      .insert(notificationData)
      .select()
      .single();

    if (notifError) {
      console.error("Admin notification creation error:", notifError);

      // 🕵️ AUDIT LOG: Track notification creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_failed",
        resourceType: "Notification",
        description: `Failed to create bulk notification: "${title}" - ${notifError.message}`,
        metadata: {
          title,
          targetAudience: target_audience,
          error: notifError.message,
          attemptedBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      throw notifError;
    }

    console.log("Created admin notification with ID:", notification.id);

    // If notification is scheduled, return success without sending immediately
    if (scheduled_for) {
      // 🕵️ AUDIT LOG: Track scheduled notification creation
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "schedule_notification",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Scheduled notification: "${title}" for ${new Date(
          scheduled_for
        ).toLocaleString()}`,
        metadata: {
          notificationId: notification.id,
          title,
          targetAudience: target_audience,
          specificUsersCount: specific_users.length,
          channels,
          scheduledFor: scheduled_for,
          scheduledBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json({
        success: true,
        notification: {
          ...notification,
          status: "scheduled",
        },
        message: "Notification scheduled successfully",
        _admin: {
          performedBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
          performedAt: new Date().toISOString(),
          auditLogged: true,
        },
      });
    }

    // Send notification immediately if not scheduled
    const sendResult = await sendNotificationToUsers({
      title,
      message,
      type,
      target_audience,
      specific_users,
      channels,
      admin_notification_id: notification.id,
      adminUser,
    });

    // 🕵️ AUDIT LOG: Track notification sending result
    if (sendResult.success) {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "send_bulk_notification",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Sent bulk notification to ${
          sendResult.total
        } users via ${channels.join(", ")}: "${title}"`,
        metadata: {
          notificationId: notification.id,
          title,
          targetAudience: target_audience,
          channels,
          totalUsers: sendResult.total,
          successful: sendResult.successful,
          failed: sendResult.failed,
          deliveryResults: sendResult.deliveryResults,
          type,
          isUrgent: is_urgent,
          sentBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
          sentAt: new Date().toISOString(),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    } else {
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_delivery_failed",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Failed to deliver bulk notification: "${title}" - ${sendResult.error}`,
        metadata: {
          notificationId: notification.id,
          title,
          targetAudience: target_audience,
          channels,
          error: sendResult.error,
          attemptedBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    return NextResponse.json({
      success: sendResult.success,
      notification: {
        ...notification,
        status: sendResult.success ? "sent" : "failed",
      },
      sendResult,
      message: sendResult.success
        ? "Notification sent successfully"
        : "Failed to send notification",
      _admin: {
        performedBy: adminUser?.email,
        senderName: getSenderDisplayName(adminUser),
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("Create notification error:", error);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "bulk_notification_error",
      resourceType: "Notification",
      description: `Unexpected error during bulk notification: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
        senderName: getSenderDisplayName(adminUser),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin", "support_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const clientInfo = getClientInfo(req.headers);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const range = searchParams.get("range");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("admin_notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (range && range !== "total") {
      const date = new Date();
      switch (range) {
        case "today":
          date.setHours(0, 0, 0, 0);
          query = query.gte("created_at", date.toISOString());
          break;
        case "week":
          date.setDate(date.getDate() - 7);
          query = query.gte("created_at", date.toISOString());
          break;
        case "month":
          date.setMonth(date.getMonth() - 1);
          query = query.gte("created_at", date.toISOString());
          break;
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      // 🕵️ AUDIT LOG: Track fetch failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notifications_fetch_failed",
        resourceType: "Notification",
        description: `Failed to fetch notifications: ${error.message}`,
        metadata: {
          page,
          limit,
          search,
          type,
          status,
          range,
          error: error.message,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      throw error;
    }

    // 🕵️ AUDIT LOG: Track notifications list access
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "view_notifications_list",
      resourceType: "Notification",
      description: `Viewed notifications list: page ${page}, ${
        notifications?.length || 0
      } results`,
      metadata: {
        page,
        limit,
        search,
        type,
        status,
        range,
        resultsCount: notifications?.length || 0,
        totalCount: count || 0,
        accessedBy: adminUser?.email,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      page,
      limit,
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("Fetch notifications error:", error);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "notifications_list_error",
      resourceType: "Notification",
      description: `Unexpected error fetching notifications: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await requireAdmin(req);
    if (adminUser instanceof NextResponse) return adminUser;

    const allowedRoles = ["super_admin", "operations_admin"];
    if (!allowedRoles.includes(adminUser?.admin_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const clientInfo = getClientInfo(req.headers);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const { data: existingNotification, error: fetchError } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // 🕵️ AUDIT LOG: Track deletion attempt on non-existent notification
        await createAuditLog({
          userId: adminUser?.id,
          userEmail: adminUser?.email,
          action: "notification_delete_failed",
          resourceType: "Notification",
          resourceId: id,
          description: `Failed to delete notification ${id}: Not found`,
          metadata: {
            notificationId: id,
            error: "Notification not found",
            attemptedBy: adminUser?.email,
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
        });

        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (existingNotification.status === "sent") {
      // 🕵️ AUDIT LOG: Track unauthorized deletion attempt
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notification_delete_attempt",
        resourceType: "Notification",
        resourceId: id,
        description: `Attempted to delete sent notification: "${existingNotification.title}"`,
        metadata: {
          notificationId: id,
          title: existingNotification.title,
          status: existingNotification.status,
          targetAudience: existingNotification.target_audience,
          sentAt: existingNotification.sent_at,
          attemptedBy: adminUser?.email,
          reason: "Cannot delete already sent notifications",
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      return NextResponse.json(
        { error: "Cannot delete already sent notifications" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("admin_notifications")
      .delete()
      .eq("id", id);

    if (error) {
      // 🕵️ AUDIT LOG: Track deletion failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "notification_delete_failed",
        resourceType: "Notification",
        resourceId: id,
        description: `Failed to delete notification ${id}: ${error.message}`,
        metadata: {
          notificationId: id,
          title: existingNotification.title,
          status: existingNotification.status,
          targetAudience: existingNotification.target_audience,
          error: error.message,
          attemptedBy: adminUser?.email,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      throw error;
    }

    // 🕵️ AUDIT LOG: Track successful notification deletion
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "delete_notification",
      resourceType: "Notification",
      resourceId: id,
      description: `Deleted notification: "${existingNotification.title}"`,
      metadata: {
        notificationId: id,
        title: existingNotification.title,
        status: existingNotification.status,
        targetAudience: existingNotification.target_audience,
        type: existingNotification.type,
        createdAt: existingNotification.created_at,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("Delete notification error:", error);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "notification_delete_error",
      resourceType: "Notification",
      description: `Unexpected error during notification deletion: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update notification
export async function PATCH(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Get current notification state for audit log
    const { data: currentNotification, error: fetchError } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Prevent updates to sent notifications
    if (currentNotification.status === "sent") {
      return NextResponse.json(
        { error: "Cannot modify already sent notifications" },
        { status: 400 }
      );
    }

    const { data: updatedNotification, error } = await supabase
      .from("admin_notifications")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 🕵️ AUDIT LOG: Track notification update
    const changedFields = Object.keys(updates);
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_notification",
      resourceType: "Notification",
      resourceId: id,
      description: `Updated notification: "${
        currentNotification.title
      }" - ${changedFields.join(", ")}`,
      metadata: {
        notificationId: id,
        title: currentNotification.title,
        changedFields,
        previousValues: currentNotification,
        newValues: updatedNotification,
        updatedBy: adminUser?.email,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      notification: updatedNotification,
      message: "Notification updated successfully",
      _admin: {
        performedBy: adminUser?.email,
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

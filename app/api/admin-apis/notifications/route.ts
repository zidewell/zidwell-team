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
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (!accessTokenMatch) return null;

    const accessToken = accessTokenMatch[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Error getting admin user:", error);
      return null;
    }

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
  if (adminUser?.first_name) {
    return adminUser.first_name;
  }

  if (adminUser?.email) {
    const emailName = adminUser.email.split("@")[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return "Zidwell Team";
}

// Enhanced markdown parser function for email and in-app notifications with image support
const parseMarkdown = (text: string, context: "email" | "app" = "app") => {
  if (!text) return "";

  // First, handle images differently for email vs app
  let processed = text;

  if (context === "email") {
    // For email: Create table-based image layout for better compatibility
    processed = processed.replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*>/gim,
      (match, imageUrl) => {
        // Check if it's a base64 image (shouldn't be in final email)
        if (imageUrl.startsWith("data:image")) {
          return `<div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #C29307; margin: 15px 0; font-size: 14px; color: #666666; text-align: center;">
                    🖼️ <strong>Image included in notification</strong><br>
                    <small>(View in the app to see the image)</small>
                  </div>`;
        }

        // For external URLs, create email-friendly image tag with table layout
        return `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; max-width: 100%; width: 100%;">
            <tr>
              <td align="center" style="padding: 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; max-width: 100%; width: 100%;">
                  <tr>
                    <td align="center" style="padding: 15px;">
                      <img 
                        src="${imageUrl}" 
                        alt="Notification Image" 
                        style="display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto; border: 0; outline: none; text-decoration: none;"
                        width="100%"
                        border="0"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      }
    );

    // Also handle markdown image syntax for email
    processed = processed.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      (match, altText, imageUrl) => {
        // Check if it's a base64 image
        if (imageUrl.startsWith("data:image")) {
          return `<div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #C29307; margin: 15px 0; font-size: 14px; color: #666666; text-align: center;">
                    🖼️ <strong>${
                      altText || "Image included in notification"
                    }</strong><br>
                    <small>(View in the app to see the image)</small>
                  </div>`;
        }

        return `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; max-width: 100%; width: 100%;">
            <tr>
              <td align="center" style="padding: 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; max-width: 100%; width: 100%;">
                  <tr>
                    <td align="center" style="padding: 15px;">
                      <img 
                        src="${imageUrl}" 
                        alt="${altText || "Notification Image"}" 
                        style="display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto; border: 0; outline: none; text-decoration: none;"
                        width="100%"
                        border="0"
                      />
                      ${
                        altText
                          ? `<div style="font-size: 12px; color: #6b7280; margin-top: 10px; font-style: italic; padding: 0 10px;">${altText}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      }
    );
  } else {
    // For app: Keep original img tags but add proper styling
    processed = processed.replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*>/gim,
      (match, imageUrl) => {
        // Remove any existing inline styles and add our own
        return match
          .replace(
            /style=["'][^"']*["']/i,
            'style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;"'
          )
          .replace(
            /<img/i,
            '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;"'
          );
      }
    );

    // Also handle markdown image syntax for app
    processed = processed.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      (match, altText, imageUrl) => {
        return `<img src="${imageUrl}" alt="${
          altText || "Notification Image"
        }" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;" />`;
      }
    );
  }

  // Then handle other markdown
  return (
    processed
      // Headers
      .replace(
        /^# (.*$)/gim,
        context === "email"
          ? '<h1 style="font-size: 24px; font-weight: bold; margin: 25px 0 15px 0; color: #333333; line-height: 1.3;">$1</h1>'
          : '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>'
      )
      .replace(
        /^## (.*$)/gim,
        context === "email"
          ? '<h2 style="font-size: 20px; font-weight: bold; margin: 20px 0 12px 0; color: #333333; line-height: 1.3;">$1</h2>'
          : '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>'
      )
      .replace(
        /^### (.*$)/gim,
        context === "email"
          ? '<h3 style="font-size: 18px; font-weight: bold; margin: 18px 0 10px 0; color: #333333; line-height: 1.3;">$1</h3>'
          : '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>'
      )
      // Bold
      .replace(
        /\*\*(.*?)\*\*/gim,
        context === "email"
          ? '<strong style="font-weight: bold;">$1</strong>'
          : '<strong class="font-bold">$1</strong>'
      )
      // Italic
      .replace(
        /\*(.*?)\*/gim,
        context === "email"
          ? '<em style="font-style: italic;">$1</em>'
          : '<em class="italic">$1</em>'
      )
      // Strikethrough
      .replace(
        /~~(.*?)~~/gim,
        context === "email"
          ? '<s style="text-decoration: line-through;">$1</s>'
          : '<s class="line-through">$1</s>'
      )
      // Links
      .replace(
        /\[([^\[]+)\]\(([^\)]+)\)/gim,
        context === "email"
          ? '<a href="$2" style="color: #C29307; text-decoration: none; font-weight: 500;" target="_blank">$1</a>'
          : '<a href="$2" class="text-blue-500 underline hover:text-blue-700" target="_blank">$1</a>'
      )
      // Line breaks
      .replace(/\n/gim, "<br>")
      // Legacy image placeholder support
      .replace(
        /\[Image: (.*?)\]/gim,
        context === "email"
          ? '<div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #C29307; margin: 15px 0; font-size: 14px; color: #666666;">🖼️ Image: $1</div>'
          : '<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-[#C29307] my-4 text-sm text-gray-600">🖼️ Image: $1</div>'
      )
      // Handle HTML line breaks
      .replace(/<br\s*\/?>/gim, "<br>")
  );
};

// Function to extract image URLs from markdown
function extractImageUrlsFromMarkdown(markdown: string): string[] {
  const imageUrls: string[] = [];

  // Match HTML img tags
  const htmlImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/g;
  let match;

  while ((match = htmlImgRegex.exec(markdown)) !== null) {
    const url = match[1];
    if (url && !url.startsWith("#") && !url.startsWith("data:image")) {
      imageUrls.push(url);
    }
  }

  // Match markdown image syntax
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const url = match[2];
    if (url && !url.startsWith("#") && !url.startsWith("data:image")) {
      imageUrls.push(url);
    }
  }

  return imageUrls;
}

// Function to delete images from storage
async function deleteImagesFromStorage(imageUrls: string[]) {
  try {
    const imagesToDelete: string[] = [];

    // Extract file paths from URLs
    for (const url of imageUrls) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const bucketIndex = pathParts.indexOf("notification-images");

        if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
          const filePath = pathParts.slice(bucketIndex + 1).join("/");
          imagesToDelete.push(filePath);
          console.log("Image to delete:", filePath);
        }
      } catch (error) {
        console.error("Error parsing URL:", url, error);
      }
    }

    if (imagesToDelete.length > 0) {
      console.log(`Deleting ${imagesToDelete.length} images from storage...`);
      const { error } = await supabase.storage
        .from("notification-images")
        .remove(imagesToDelete);

      if (error) {
        console.error("Error deleting images:", error);
      } else {
        console.log(
          `Successfully deleted ${imagesToDelete.length} images from storage`
        );
      }
    } else {
      console.log("No images to delete from storage");
    }
  } catch (error) {
    console.error("Error in deleteImagesFromStorage:", error);
  }
}

// Updated sendEmailNotification function with enhanced image support
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
    console.log("Original message length:", message.length);

    // Debug: Check for images in the message
    const imageUrls = extractImageUrlsFromMarkdown(message);
    console.log(`Found ${imageUrls.length} image URLs in message:`, imageUrls);

    // Check for base64 images (should not be in final email)
    const base64Images = message.match(/data:image\/[^;]+;base64,[^"'\s]+/g);
    if (base64Images && base64Images.length > 0) {
      console.warn(
        `⚠️ Warning: Found ${base64Images.length} base64 images in email message!`
      );
      console.warn("Base64 images may not display properly in email clients.");
    }

    const senderName = getSenderDisplayName(adminUser);
    const signatureName =
      senderName !== "Zidwell Team" ? senderName : "Zidwell Team";

    // Parse the message for email with enhanced image handling
    const emailHtml = parseMarkdown(message, "email");

    // Create plain text version
    const plainText = message
      .replace(/<[^>]*>/g, "")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "Image: $1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/\n{3,}/g, "\n\n");

    const mailOptions = {
      from: `Zidwell <${process.env.EMAIL_USER}>`,
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
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #C29307 0%, #a87e06 100%);
          padding: 30px 20px; 
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
        .message-content img {
          max-width: 100% !important;
          height: auto !important;
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
            width: 100% !important;
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
         
          <hr style="border: none; height: 1px; background: rgba(255, 255, 255, 0.3); margin: 20px 0;"/>
          <h1 class="headline">${subject}</h1>
        </div>
        
        <div class="content">
          <p class="paragraph">Hello,</p>
          
          <div class="message-content">
            ${emailHtml}
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
      text: plainText,
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
    console.log("Specific users:", specific_users.length);
    console.log("Sender:", getSenderDisplayName(adminUser));

    // Debug: Check message for images
    console.log("Message length:", message.length);
    const imageUrls = extractImageUrlsFromMarkdown(message);
    console.log(`Found ${imageUrls.length} image URLs in message`);
    imageUrls.forEach((url, i) => {
      console.log(`  Image ${i + 1}: ${url.substring(0, 100)}...`);
    });

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
        // Parse message for in-app display
        const inAppMessage = parseMarkdown(message, "app");

        const notifications = users.map((user) => ({
          user_id: user.id,
          title,
          message: inAppMessage, // Store parsed message for in-app display
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
          image_count: imageUrls.length,
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
      image_count: imageUrls.length,
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
    console.log("=== START: Notification Creation ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);

    // Check admin authentication
    console.log("Calling requireAdmin...");
    const adminUser = await requireAdmin(req);

    if (adminUser instanceof NextResponse) {
      console.log("❌ requireAdmin returned NextResponse (failed)");
      console.log("Response status:", adminUser.status);
      const errorBody = await adminUser.json();
      console.log("Error response body:", JSON.stringify(errorBody, null, 2));
      return adminUser;
    }

    console.log("✅ Admin authenticated successfully");
    console.log("Admin user object:", {
      id: adminUser?.id,
      email: adminUser?.email,
      admin_role: adminUser?.admin_role,
      hasAdminRole: !!adminUser?.admin_role,
    });

    const allowedRoles = ["super_admin", "operations_admin"];
    console.log("Checking permissions...");
    console.log("User role:", adminUser?.admin_role);
    console.log("Allowed roles:", allowedRoles);
    console.log(
      "Is role allowed?",
      allowedRoles.includes(adminUser?.admin_role)
    );

    if (!allowedRoles.includes(adminUser?.admin_role)) {
      console.log("❌ Permission denied!");
      console.log("User role", adminUser?.admin_role, "is not in allowedRoles");
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
          details: {
            userRole: adminUser?.admin_role,
            allowedRoles: allowedRoles,
            requiredFor: "creating notifications",
          },
        },
        { status: 403 }
      );
    }

    console.log("✅ Permission check passed");

    // Get client info for audit log
    const clientInfo = getClientInfo(req.headers);
    console.log("Client info:", clientInfo);

    // Parse request body
    console.log("Parsing request body...");
    const body = await req.json();
    console.log("Request body received:", {
      title: body.title,
      messageLength: body.message?.length,
      type: body.type,
      target_audience: body.target_audience,
      specific_users_count: body.specific_users?.length || 0,
      channels: body.channels,
      is_urgent: body.is_urgent,
      scheduled_for: body.scheduled_for,
    });

    // Debug: Check for images in the message
    const imageUrls = extractImageUrlsFromMarkdown(body.message || "");
    console.log(`Found ${imageUrls.length} image URLs in message`);
    imageUrls.forEach((url, i) => {
      console.log(`  Image ${i + 1}: ${url.substring(0, 100)}...`);
    });

    // Check for base64 images
    const base64Images = (body.message || "").match(
      /data:image\/[^;]+;base64,[^"'\s]+/g
    );
    if (base64Images && base64Images.length > 0) {
      console.log(
        `⚠️ Warning: Found ${base64Images.length} base64 images in message`
      );
      console.log(
        "Base64 images should have been uploaded already. This may cause issues."
      );
    }

    // Validate required fields
    if (!body.title || !body.message) {
      console.log("❌ Validation failed: Missing title or message");
      console.log("Title:", body.title);
      console.log("Message:", body.message ? "Present" : "Missing");
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    console.log("✅ Required fields validation passed");

    // Validate specific users selection
    if (
      body.target_audience === "specific_users" &&
      (!body.specific_users || body.specific_users.length === 0)
    ) {
      console.log(
        "❌ Validation failed: Specific users required but not provided"
      );
      return NextResponse.json(
        {
          error:
            "At least one user must be selected for specific user notifications",
        },
        { status: 400 }
      );
    }

    // Validate channels
    if (!body.channels || body.channels.length === 0) {
      console.log("❌ Validation failed: No channels selected");
      return NextResponse.json(
        { error: "At least one channel must be selected" },
        { status: 400 }
      );
    }

    console.log("✅ All validations passed");

    // 🕵️ AUDIT LOG: Track notification creation attempt
    console.log("Creating audit log...");
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "create_bulk_notification",
      resourceType: "Notification",
      description: `Creating bulk notification: "${body.title}" for ${body.target_audience}`,
      metadata: {
        title: body.title,
        messageLength: body.message.length,
        type: body.type,
        targetAudience: body.target_audience,
        specificUsersCount: body.specific_users?.length || 0,
        channels: body.channels,
        isUrgent: body.is_urgent,
        scheduledFor: body.scheduled_for,
        imageCount: imageUrls.length,
        base64ImageCount: base64Images?.length || 0,
        createdBy: adminUser?.email,
        senderName: getSenderDisplayName(adminUser),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
    console.log("✅ Audit log created");

    // Prepare notification data
    console.log("Preparing notification data...");
    const notificationData: any = {
      title: body.title,
      message: body.message,
      type: body.type || "info",
      target_audience: body.target_audience || "all_users",
      specific_users:
        body.specific_users?.length > 0 ? body.specific_users : [],
      channels: body.channels || ["in_app"],
      is_urgent: body.is_urgent || false,
      status: body.scheduled_for ? "scheduled" : "sending",
      created_by: adminUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields only if they have values
    if (body.scheduled_for) {
      notificationData.scheduled_for = body.scheduled_for;
    }

    console.log("Notification data prepared:", {
      title: notificationData.title,
      status: notificationData.status,
      target_audience: notificationData.target_audience,
      scheduled_for: notificationData.scheduled_for,
      image_count: imageUrls.length,
    });

    // Insert into database
    console.log("Inserting notification into database...");
    const { data: notification, error: notifError } = await supabase
      .from("admin_notifications")
      .insert(notificationData)
      .select()
      .single();

    if (notifError) {
      console.error("❌ Database insertion error:", notifError);
      console.error("Error details:", {
        message: notifError.message,
        code: notifError.code,
        details: notifError.details,
        hint: notifError.hint,
      });

      // 🕵️ AUDIT LOG: Track notification creation failure
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_failed",
        resourceType: "Notification",
        description: `Failed to create bulk notification: "${body.title}" - ${notifError.message}`,
        metadata: {
          title: body.title,
          targetAudience: body.target_audience,
          error: notifError.message,
          errorCode: notifError.code,
          errorDetails: notifError.details,
          attemptedBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      throw notifError;
    }

    console.log("✅ Notification created in database:", notification.id);

    // If notification is scheduled, return success without sending immediately
    if (body.scheduled_for) {
      console.log("⏰ Notification is scheduled for:", body.scheduled_for);

      // 🕵️ AUDIT LOG: Track scheduled notification creation
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "schedule_notification",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Scheduled notification: "${body.title}" for ${new Date(
          body.scheduled_for
        ).toLocaleString()}`,
        metadata: {
          notificationId: notification.id,
          title: body.title,
          targetAudience: body.target_audience,
          specificUsersCount: body.specific_users?.length || 0,
          channels: body.channels,
          scheduledFor: body.scheduled_for,
          imageCount: imageUrls.length,
          scheduledBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      console.log("✅ Returning success for scheduled notification");

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

    console.log("🚀 Sending notification immediately...");

    // Send notification immediately if not scheduled
    const sendResult = await sendNotificationToUsers({
      title: body.title,
      message: body.message,
      type: body.type || "info",
      target_audience: body.target_audience || "all_users",
      specific_users: body.specific_users || [],
      channels: body.channels || ["in_app"],
      admin_notification_id: notification.id,
      adminUser,
    });

    console.log("📤 Send result:", {
      success: sendResult.success,
      total: sendResult.total,
      successful: sendResult.successful,
      failed: sendResult.failed,
      image_count: sendResult.image_count,
    });

    // 🕵️ AUDIT LOG: Track notification sending result
    if (sendResult.success) {
      console.log("✅ Notification sent successfully");
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "send_bulk_notification",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Sent bulk notification to ${
          sendResult.total
        } users via ${body.channels.join(", ")}: "${body.title}"`,
        metadata: {
          notificationId: notification.id,
          title: body.title,
          targetAudience: body.target_audience,
          channels: body.channels,
          totalUsers: sendResult.total,
          successful: sendResult.successful,
          failed: sendResult.failed,
          imageCount: sendResult.image_count,
          deliveryResults: sendResult.deliveryResults,
          type: body.type,
          isUrgent: body.is_urgent,
          sentBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
          sentAt: new Date().toISOString(),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    } else {
      console.log("❌ Failed to send notification:", sendResult.error);
      await createAuditLog({
        userId: adminUser?.id,
        userEmail: adminUser?.email,
        action: "bulk_notification_delivery_failed",
        resourceType: "Notification",
        resourceId: notification.id,
        description: `Failed to deliver bulk notification: "${body.title}" - ${sendResult.error}`,
        metadata: {
          notificationId: notification.id,
          title: body.title,
          targetAudience: body.target_audience,
          channels: body.channels,
          error: sendResult.error,
          attemptedBy: adminUser?.email,
          senderName: getSenderDisplayName(adminUser),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    console.log("=== END: Notification Creation ===");

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
    console.error("=== ERROR: Notification Creation ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error full:", error);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    console.log("Creating error audit log...");
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "bulk_notification_error",
      resourceType: "Notification",
      description: `Unexpected error during bulk notification: ${error.message}`,
      metadata: {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        senderName: getSenderDisplayName(adminUser),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    console.error("=== END ERROR ===");

    return NextResponse.json(
      {
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
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

    // Extract image URLs from the message before deleting
    const imageUrls = extractImageUrlsFromMarkdown(
      existingNotification.message
    );

    // Delete the notification
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

    // Delete associated images from storage (async, don't wait for completion)
    if (imageUrls.length > 0) {
      deleteImagesFromStorage(imageUrls).catch((error) => {
        console.error("Failed to delete images:", error);
      });
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
        deletedImagesCount: imageUrls.length,
        deletedBy: adminUser?.email,
        deletionTime: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
      deletedImagesCount: imageUrls.length,
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

export async function PATCH(req: Request) {
  try {
    // Get admin user info for audit logging
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    const body = await req.json();
    const { id, ...updates } = body;

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

    // If message is being updated, check for image changes
    let imagesToDelete: string[] = [];
    if (updates.message && updates.message !== currentNotification.message) {
      // Extract old image URLs
      const oldImageUrls = extractImageUrlsFromMarkdown(
        currentNotification.message
      );
      const newImageUrls = extractImageUrlsFromMarkdown(updates.message);

      // Find images that were removed
      imagesToDelete = oldImageUrls.filter(
        (url) => !newImageUrls.includes(url)
      );
    }

    // Handle scheduled_for updates
    let status = currentNotification.status;
    if (updates.scheduled_for !== undefined) {
      if (updates.scheduled_for) {
        status = "scheduled";
      } else if (currentNotification.status === "scheduled") {
        status = "draft";
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      status,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedNotification, error } = await supabase
      .from("admin_notifications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Delete orphaned images (async)
    if (imagesToDelete.length > 0) {
      deleteImagesFromStorage(imagesToDelete).catch((error) => {
        console.error("Failed to delete orphaned images:", error);
      });
    }

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
        previousValues: {
          ...currentNotification,
          message:
            currentNotification.message.substring(0, 100) +
            (currentNotification.message.length > 100 ? "..." : ""),
        },
        newValues: {
          ...updatedNotification,
          message:
            updatedNotification.message.substring(0, 100) +
            (updatedNotification.message.length > 100 ? "..." : ""),
        },
        deletedImagesCount: imagesToDelete.length,
        updatedBy: adminUser?.email,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      notification: updatedNotification,
      message: "Notification updated successfully",
      deletedImagesCount: imagesToDelete.length,
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

// Add a PUT endpoint for updating and sending immediately
export async function PUT(req: NextRequest) {
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

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Get current notification state
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

    // Check if notification can be sent
    if (currentNotification.status === "sent") {
      return NextResponse.json(
        { error: "Cannot update and send already sent notifications" },
        { status: 400 }
      );
    }

    // If message is being updated, check for image changes
    let imagesToDelete: string[] = [];
    if (updates.message && updates.message !== currentNotification.message) {
      // Extract old image URLs
      const oldImageUrls = extractImageUrlsFromMarkdown(
        currentNotification.message
      );
      const newImageUrls = extractImageUrlsFromMarkdown(updates.message);

      // Find images that were removed
      imagesToDelete = oldImageUrls.filter(
        (url) => !newImageUrls.includes(url)
      );
    }

    // First update the notification
    const updateData = {
      ...updates,
      status: "sending",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedNotification, error: updateError } = await supabase
      .from("admin_notifications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Delete orphaned images (async)
    if (imagesToDelete.length > 0) {
      deleteImagesFromStorage(imagesToDelete).catch((error) => {
        console.error("Failed to delete orphaned images:", error);
      });
    }

    // Send the notification
    const sendResult = await sendNotificationToUsers({
      title: updatedNotification.title,
      message: updatedNotification.message,
      type: updatedNotification.type,
      target_audience: updatedNotification.target_audience,
      specific_users: updatedNotification.specific_users || [],
      channels: updatedNotification.channels,
      admin_notification_id: updatedNotification.id,
      adminUser,
    });

    // 🕵️ AUDIT LOG: Track update and send
    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_and_send_notification",
      resourceType: "Notification",
      resourceId: id,
      description: `Updated and sent notification: "${updatedNotification.title}"`,
      metadata: {
        notificationId: id,
        title: updatedNotification.title,
        targetAudience: updatedNotification.target_audience,
        channels: updatedNotification.channels,
        type: updatedNotification.type,
        successful: sendResult.successful,
        failed: sendResult.failed,
        deletedImagesCount: imagesToDelete.length,
        sentBy: adminUser?.email,
        senderName: getSenderDisplayName(adminUser),
        sentAt: new Date().toISOString(),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return NextResponse.json({
      success: sendResult.success,
      notification: updatedNotification,
      sendResult,
      deletedImagesCount: imagesToDelete.length,
      message: sendResult.success
        ? "Notification updated and sent successfully"
        : "Failed to send notification after update",
      _admin: {
        performedBy: adminUser?.email,
        senderName: getSenderDisplayName(adminUser),
        performedAt: new Date().toISOString(),
        auditLogged: true,
      },
    });
  } catch (error: any) {
    console.error("Update and send notification error:", error);

    // 🕵️ AUDIT LOG: Track unexpected errors
    const cookieHeader = req.headers.get("cookie") || "";
    const adminUser = await getAdminUserInfo(cookieHeader);
    const clientInfo = getClientInfo(req.headers);

    await createAuditLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      action: "update_and_send_notification_error",
      resourceType: "Notification",
      description: `Unexpected error during update and send: ${error.message}`,
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

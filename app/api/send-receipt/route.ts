import { v4 as uuidv4 } from "uuid";

import { transporter } from "@/lib/node-mailer";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// import { clearAllReceiptsCache } from "../get-receipt-db/route";
// import {
//   clearWalletBalanceCache,
// } from "../wallet-balance/route";
// import { clearTransactionsCache } from "../bill-transactions/route";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, initiatorEmail, initiatorName, receiptId, userId } = body;

    if (!receiptId || !data || !initiatorEmail || !initiatorName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const token = uuidv4();
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_URL
        : process.env.NEXT_PUBLIC_BASE_URL;
    const signingLink = `${baseUrl}/sign-receipt/${token}`;
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Save to Supabase
    const { error } = await supabase.from("receipts").upsert(
      [
        {
          token,
          receipt_id: receiptId,
          initiator_email: initiatorEmail,
          initiator_name: initiatorName,
          signee_name: data.name,
          signee_email: data.email,
          signing_link: signingLink,
          verification_code: verificationCode,
          bill_to: data.bill_to,
          payment_for: data.payment_for,
          issue_date: data.issue_date,
          customer_note: data.customer_note,
          receipt_items: data.receipt_items,
          created_at: new Date().toISOString(),
          status: "pending",
        },
      ],
      {
        onConflict: "receipt_id",
      }
    );

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { message: "Failed to save receipt request" },
        { status: 500 }
      );
    }

    const headerImageUrl = `${baseUrl}/zidwell-header.png`;
    const footerImageUrl = `${baseUrl}/zidwell-footer.png`;



    // Send email to signee
 await transporter.sendMail({
  from: `Zidwell Receipts <${process.env.EMAIL_USER}>`,
  to: data.email,
  subject: "Action Required: Please Sign Your Receipt",
  html: `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff; border-radius:8px; overflow:hidden;">

        <!-- Header -->
        <tr>
          <td>
            <img
              src="${headerImageUrl}"
              alt="Zidwell Header"
              style="width:100%; max-width:600px; display:block;"
            />
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:24px; color:#333; line-height:1.6;">
            <p style="margin-top: 0;">Hello ${data.name || "Valued Customer"},</p>
            <p>You've been sent a receipt that requires your signature from <strong>${initiatorName}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #C29307; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #C29307; font-size: 16px;">
                Verification Code:
              </p>
              <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 2px dashed #e5e7eb;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">
                  ${verificationCode}
                </span>
              </div>
              <p style="margin: 10px 0 0 0; font-size: 13px; color: #6b7280;">
                Use this code to verify your identity when signing the receipt.
              </p>
            </div>
            
            <p>Click below to review and sign the receipt:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${signingLink}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block; 
                        background:#C29307; 
                        color:white; 
                        padding:14px 28px; 
                        border-radius:6px; 
                        text-decoration:none; 
                        font-weight:bold;
                        font-size: 16px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ✍️ Sign Receipt
              </a>
            </div>
            
            <p style="margin-top: 20px;"><strong>Or copy and paste this link into your browser:</strong></p>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin: 10px 0 20px 0; word-break: break-all;">
              <a href="${signingLink}" style="color:#C29307; text-decoration: none; font-size: 14px;">
                ${signingLink}
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 14px; color: #6b7280;">
                <strong>Important:</strong> 
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                  <li>This link and verification code will expire for security reasons</li>
                  <li>Review all details carefully before signing</li>
                  <li>Once signed, the receipt will be legally binding</li>
                </ul>
              </p>
              <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
                If you were not expecting this receipt, you can safely ignore this email.
              </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">– Zidwell Receipts Team</p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td>
            <img
              src="${footerImageUrl}"
              alt="Zidwell Footer"
              style="width:100%; max-width:600px; display:block;"
            />
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`,
});

    // clearAllReceiptsCache();
    // clearWalletBalanceCache(userId);
    // clearTransactionsCache(userId);

    return NextResponse.json({
      message: "Receipt signing request sent successfully.",
      signingLink,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

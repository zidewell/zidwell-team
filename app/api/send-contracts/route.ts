import { v4 as uuidv4 } from "uuid";

import { transporter } from "@/lib/node-mailer";
import { createClient } from "@supabase/supabase-js";
// import { clearTransactionsCache } from "../bill-transactions/route";
// import { clearWalletBalanceCache } from "../wallet-balance/route";
// import { clearContractsCache } from "../get-contracts-db/route";
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      initiatorName,
      signeeEmail,
      contractText,
      contractTitle,
      initiatorEmail,
      status,
    } = body;

    if (
      !signeeEmail ||
      !contractText ||
      !contractTitle ||
      !initiatorEmail ||
      !status ||
      !initiatorName
    ) {
      return new Response(JSON.stringify({ message: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = uuidv4();
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_URL
        : process.env.NEXT_PUBLIC_BASE_URL;
    const signingLink = `${baseUrl}/sign-contract/${token}`;
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // ⬇️ Store in Supabase
    const { error } = await supabase.from("contracts").insert({
      token,
      signee_email: signeeEmail,
      initiator_email: initiatorEmail,
      initiator_name: initiatorName,
      contract_text: contractText,
      contract_title: contractTitle,
      signing_link: signingLink,
      status,
      verification_code: verificationCode,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(
        JSON.stringify({ message: "Failed to save contract" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const headerImageUrl = `${baseUrl}/zidwell-header.png`;
    const footerImageUrl = `${baseUrl}/zidwell-footer.png`;

    await transporter.sendMail({
      from: `Zidwell Contracts <${process.env.EMAIL_USER}>`,
      to: signeeEmail,
      subject: "You've been invited to sign a contract",
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

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
          <td style="padding:24px; color:#333; line-height:1.6; font-size:15px;">

            <p style="margin-top: 0;">Hello,</p>
            <p>You have received a new contract that requires your signature.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #C29307; margin: 20px 0;">
              <p style="color: #C29307; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">
                Your verification code:
              </p>
              <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 2px dashed #e5e7eb;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">
                  ${verificationCode}
                </span>
              </div>
            </div>
            
            <p>Please click the secure link below to review and sign the document:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${signingLink}" target="_blank" rel="noopener noreferrer"
                style="display: inline-block; background-color: #C29307; color: white; 
                       padding: 14px 28px; text-decoration: none; border-radius: 6px; 
                       font-weight: bold; font-size: 16px; cursor:pointer;">
                ✍️ Review & Sign Contract
              </a>
            </div>
            
            <p style="margin-top: 20px;"><strong>Or copy and paste this link into your browser:</strong></p>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin: 10px 0 20px 0; word-break: break-all;">
              <a href="${signingLink}" style="color: #C29307; text-decoration: none; font-size: 14px;">
                ${signingLink}
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 13px; color: #6b7280;">
                <strong>Important:</strong> This link and verification code will expire for security reasons.
                If you did not request this, you can safely ignore this email.
              </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 13px; color: #999;">
              – Zidwell Contracts
            </p>

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

    return new Response(JSON.stringify({ message: "Email sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending signature request:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

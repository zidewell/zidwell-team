// app/api/contact/route.ts
import { transporter } from "@/lib/node-mailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
     const body = await req.json();
    const { name, email, message } = body

    // console.log(body)

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

     const baseUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_URL
        : process.env.NEXT_PUBLIC_BASE_URL;

    const headerImageUrl = `${baseUrl}/zidwell-header.png`;
    const footerImageUrl = `${baseUrl}/zidwell-footer.png`;


await transporter.sendMail({
  from: `"${name}" <${email}>`,
  to: process.env.EMAIL_USER,
  subject: "New Customer Inquiry via Zidwell Contact Form",
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
          <td style="padding:24px; color:#333;">

            <div style="font-family: Arial, sans-serif; color: #333; font-size: 16px; line-height: 1.6;">
              <h2 style="color: #0057b8; margin-top: 0;">📩 New Contact Message Received</h2>

              <p>You have received a new message through the <strong>Zidwell</strong> contact form.</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p style="margin-left: 10px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #0057b8;">
                ${message}
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

              <p style="font-size: 14px; color: #999;">This message was automatically sent from the Zidwell support form.</p>
            </div>

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

    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

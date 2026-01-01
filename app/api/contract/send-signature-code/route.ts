// app/api/contract/send-signature-code/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { contractToken, signeeEmail, signeeName } = await request.json();

    if (!contractToken || !signeeEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get contract from Supabase
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("token", contractToken)
      .single();

    if (error || !contract) {
      console.error("Contract not found:", error);
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Verify email matches
    if (contract.signee_email !== signeeEmail) {
      return NextResponse.json(
        { error: "Email does not match the contract signee" },
        { status: 403 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Update contract with verification code
    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        verification_code: verificationCode,
        verification_code_sent_at: new Date().toISOString(),
        verification_code_expires_at: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(), // 30 minutes
        verification_failed_attempts: 0, // Reset failed attempts
      })
      .eq("token", contractToken);

    if (updateError) {
      console.error("Error updating verification code:", updateError);
      return NextResponse.json(
        { error: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Send email with verification code
    await transporter.sendMail({
      from: `Zidwell Contracts <${process.env.EMAIL_USER}>`,
      to: signeeEmail,
      subject: `Your Signature Verification Code - ${
        contract.contract_title || "Contract"
      }`,
      html: `
       
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signature Verification - Zidwell Finance</title>
    
    <style>
        /* Base Styles */
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f9fafb;
            color: #374151;
            line-height: 1.6;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        .email-container {
          
            background: #ffffff;
            overflow: hidden;
        }
        
        .content-section {
            padding: 40px 30px;
        }
        
        .info-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .verification-code-box {
            text-align: center;
            margin-bottom: 25px;
        }
        
        .code-display {
            display: inline-block;
            background: #f0f9ff;
            border: 2px dashed #C29307;
            padding: 30px 50px;
            border-radius: 12px;
        }
        
        .security-notice {
            background: #f0fff4;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #38a169;
            margin: 20px 0;
        }
        
        /* Typography */
        .text-primary { color: #111827 !important; }
        .text-secondary { color: #6b7280 !important; }
        .text-accent { color: #C29307 !important; }
        .text-success { color: #2f855a !important; }
        
        .text-sm { font-size: 14px !important; }
        .text-base { font-size: 16px !important; }
        .text-lg { font-size: 20px !important; }
        .text-xl { font-size: 24px !important; }
        
        .font-semibold { font-weight: 600 !important; }
        .font-bold { font-weight: 700 !important; }
        
        /* Header */
        .email-header {
            background: #073b2a;
            padding: 30px 20px;
            text-align: center;
        }
        
        .brand-logo {
            color: #c9a227;
            font-size: 36px;
            letter-spacing: 2px;
            margin: 0;
            font-weight: 700;
        }
        
        /* Footer Styling */
        .email-footer {
            background-color: #073b2a;
            padding: 25px 20px;
            color: #ffffff;
        }
        
        .footer-services {
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
            margin: 0 0 25px 0;
        }
        
        .social-grid {
            font-size: 14px;
            line-height: 1.8;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .social-item {
            display: flex;
            align-items: center;
        }
        
        .social-icon {
            color: #c9a227;
            font-size: 20px;
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }
        
        .disclaimer {
            max-width: 360px;
            font-size: 13px;
            text-align: right;
            color: #e5e7eb;
            line-height: 1.5;
        }
        
        /* Mobile Responsive */
        @media screen and (max-width: 600px) {
            .content-section {
                padding: 30px 20px !important;
            }
            
            .email-header {
                padding: 20px 15px !important;
            }
            
            .email-footer {
                padding: 20px 15px !important;
            }
            
            .code-display {
                padding: 20px 30px !important;
            }
            
            .social-grid {
                grid-template-columns: 1fr !important;
            }
            
            .disclaimer {
                text-align: left !important;
                max-width: 100% !important;
            }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#f9fafb;">
    <div class="email-container">
        <!-- ================= HEADER ================= -->
        <div class="email-header">
            <h1 class="brand-logo">ZIDWELL</h1>
        </div>

        <!-- ================= CONTENT ================= -->
        <div class="content-section">
            
            <!-- Contract Information -->
            <div class="info-card">
                <h2 class="text-lg font-bold text-primary" style="margin: 0 0 15px 0;">Verification Required</h2>
                <p class="text-base text-secondary" style="margin: 0;">
                    You're about to sign: <strong>"${
                      contract.contract_title || "Contract"
                    }"</strong>
                </p>
                <div class="text-sm text-accent" style="margin-top: 10px;">
                    <strong>Parties:</strong> ${
                      contract.initiator_name
                    } & ${signeeName}
                </div>
            </div>
            
            <!-- Verification Code -->
            <div class="verification-code-box">
                <div class="code-display">
                    <div style="font-size: 12px; color: #C29307; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600;">
                        Verification Code
                    </div>
                    <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #1a365d; font-family: monospace; margin: 15px 0;">
                        ${verificationCode}
                    </div>
                    <div style="font-size: 14px; color: #718096; margin-top: 10px;">
                        ⏱️ Valid for 30 minutes
                    </div>
                </div>
            </div>
            
            <!-- Security Notice -->
            <div class="security-notice">
                <p class="font-semibold text-success" style="margin: 0 0 8px 0;">
                    🔒 Security Notice
                </p>
                <p style="margin: 0; color: #2f855a; font-size: 14px;">
                    For your security, never share this code with anyone. Zidwell will never ask for this code via phone or other channels.
                </p>
            </div>
            
           
            
            <!-- Warning -->
            <div style="margin-top: 25px; padding: 15px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #dc2626; font-size: 14px; text-align: center;">
                    ⚠️ If you didn't request this code, please ignore this email or contact support if you're concerned.
                </p>
            </div>
            
            <!-- Automated Message -->
            <div style="background: #fefcf5; padding: 15px; text-align: center; margin-top: 25px; border-radius: 8px;">
                <p style="margin: 0; color: #C29307; font-size: 12px;">
                    This is an automated message from Zidwell Contracts. Please do not reply to this email.
                </p>
            </div>
        </div>

        <!-- ================= FOOTER ================= -->
        <div class="email-footer">
            <h1 style="margin:0; color:#c9a227; font-size:42px; letter-spacing:3px; text-align: center;">
                ZIDWELL
            </h1>
            
            <h3 class="footer-services">
                PAYMENTS | INVOICES | RECEIPTS | CONTRACTS | TAX MANAGEMENT | FINANCIAL WELLNESS | COMMUNITY
            </h3>
            
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between;  align-items: center;">

                <!-- Social Links with Unicode Icons -->
                <div class="social-grid">
                    <div class="social-item">
                        <span class="social-icon">📷</span>
                        <span>@zidwellfinance</span>
                    </div>

                    <div class="social-item">
                        <span class="social-icon">📘</span>
                        <span>@zidwell</span>
                    </div>

                    <div class="social-item">
                        <span class="social-icon">💼</span>
                        <span>@zidwell</span>
                    </div>

                    <div class="social-item">
                        <span class="social-icon">💬</span>
                        <span>+234 706 917 5399</span>
                    </div>
                </div>

                <!-- Disclaimer -->
                <div class="disclaimer">
                    <p style="margin:6px 0; line-height:1.5; color:#e5e7eb;">
                        <strong style="color:#ffffff;">Disclaimer:</strong>
                        Please do not share your personal details such as BVN, password,
                        or OTP code with anyone.
                    </p>
                </div>

            </div>
            
            <!-- Copyright -->
            <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="margin: 0; font-size: 12px; color: #e5e7eb;">
                    © ${new Date().getFullYear()} Zidwell Finance. All rights reserved.
                </p>
            </div>
        </div>

    </div>
</body>
</html>

      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent successfully",
        data: {
          email: signeeEmail,
          expiresIn: "30 minutes",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in contract/send-signature-code:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
      },
      { status: 500 }
    );
  }
}

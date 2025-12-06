import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface RequestBody {
  userId: string;
  initiator_email: string;
  initiator_name: string;
  invoice_id: string;
  signee_name: string;
  signee_email: string;
  message: string;
  bill_to: string;
  issue_date: string;
  customer_note: string;
  invoice_items: InvoiceItem[];
  total_amount: number;
  payment_type: "single" | "multiple";
  fee_option: "absorbed" | "customer";
  status: "unpaid" | "paid" | "draft";
  business_logo?: string;
  redirect_url?: string;
  business_name: string;
  clientPhone?: string;
  initiator_account_number: string;
  initiator_account_name: string;
  target_quantity?: number;
}

function generateInvoiceId(): string {
  const randomToken = uuidv4().replace(/-/g, "").substring(0, 4).toUpperCase();
  return `INV-${randomToken}`;
}

function calculateTotals(invoiceItems: InvoiceItem[], feeOption: string) {
  const subtotal = invoiceItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );
  const feeAmount = feeOption === "customer" ? subtotal * 0.035 : 0;
  const totalAmount =
    feeOption === "customer" ? subtotal + feeAmount : subtotal;

  return { subtotal, feeAmount, totalAmount };
}

async function uploadLogoToStorage(
  userId: string,
  base64Image: string
): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileType = base64Image.split(";")[0].split("/")[1];
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}.${fileType}`;

    const { data, error } = await supabase.storage
      .from("business-logos")
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: `image/${fileType}`,
      });

    if (error) {
      console.error("Logo upload error:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-logos").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Logo upload error:", error);
    return null;
  }
}

async function sendInvoiceEmail(params: {
  to: string;
  subject: string;
  invoiceId: string;
  amount: number;
  signingLink: string;
  senderName: string;
  message?: string;
  businessLogo?: string;
  isMultiplePayments?: boolean;
  targetQuantity?: number;
}) {
  try {
    const multiplePaymentsInfo = params.isMultiplePayments
      ? `
      <div style="background:#e8f4fd; padding:15px; border-radius:6px; border-left:4px solid #2196F3; margin:15px 0;">
        <p style="margin:0; font-weight:bold; color:#1976d2;">Multiple Payments Enabled</p>
        <p style="margin:5px 0; color:#1976d2;">
          This invoice allows multiple people to pay. Each person pays the full amount of ₦${Number(
            params.amount
          ).toLocaleString()}.
          ${
            params.targetQuantity
              ? `Target: ${params.targetQuantity} people`
              : ""
          }
        </p>
        <p style="margin:5px 0; color:#1976d2; font-size:14px;">
          <strong>How it works:</strong> Click "View Invoice" below, then "Pay Now" to provide your information and make payment.
        </p>
      </div>
    `
      : "";

    await transporter.sendMail({
      from: `Zidwell Invoice <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: `
        <div style="
          font-family: Arial, sans-serif; 
          color: #333; 
          line-height: 1.6; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9f9f9; 
          border-radius: 8px; 
          border: 1px solid #e0e0e0;
        ">
          ${
            params.businessLogo
              ? `
            <div style="text-align:center; margin-bottom:20px;">
              <img src="${params.businessLogo}" alt="Business Logo" style="max-height:60px; max-width:200px;" />
            </div>`
              : `
            <div style="text-align:center; margin-bottom:20px;">
              <h2 style="color:#C29307; margin:0;">New Invoice</h2>
            </div>`
          }
          <p>Hello <strong>Valued Customer</strong>,</p>
          <p>You have received an invoice from <strong>${
            params.senderName
          }</strong>.</p>
          
          ${multiplePaymentsInfo}

          <div style="
            background:white; 
            padding:15px; 
            border-radius:6px; 
            border-left:4px solid #C29307; 
            margin:20px 0;
          ">
            <p style="margin:0; font-weight:bold;">Invoice Details:</p>
            <p style="margin:5px 0;">Invoice ID: ${params.invoiceId}</p>
            <p style="margin:5px 0;">Amount: ₦${Number(
              params.amount
            ).toLocaleString()}</p>
          
          </div>
          
          <p style="margin-bottom: 10px;">Click the button below to view invoice details and make payment:</p>
          <div style="text-align:center; margin:25px 0;">
            <a href="${params.signingLink}" 
               target="_blank"
               style="
                 display:inline-block;
                 background-color:#C29307;
                 color:#fff;
                 padding:12px 24px;
                 border-radius:6px;
                 text-decoration:none;
                 font-weight:bold;
                 font-size:16px;
               ">
              View Invoice & Pay
            </a>
          </div>
          
          ${
            params.message
              ? `
            <div style="
              background:#f0f0f0; 
              padding:15px; 
              border-radius:6px; 
              margin:20px 0;
            ">
              <p style="margin:0; font-weight:bold;">Message from ${params.senderName}:</p>
              <p style="margin:10px 0 0 0;">${params.message}</p>
            </div>`
              : ""
          }
          
          <p style="color:#666; font-size:14px;">
            You'll be able to provide your payment information and complete the payment on the invoice page.
          </p>
          
          <div style="margin-top:32px; padding-top:20px; border-top:1px solid #e0e0e0; text-align:center;">
            <p style="font-size:13px; color:#888; margin:0;">– Zidwell Contracts Team</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Email send error:", error);
  }
}

function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    const {
      userId,
      initiator_email,
      initiator_name,
      invoice_id,
      signee_name,
      signee_email,
      message,
      bill_to,
      issue_date,
      customer_note,
      invoice_items,
      total_amount,
      payment_type,
      fee_option,
      status,
      business_logo,
      redirect_url,
      business_name,
      clientPhone,
      initiator_account_number,
      initiator_account_name,
      target_quantity,
    } = body;

    if (
      !userId ||
      !signee_email ||
      !invoice_items ||
      invoice_items.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: userId, signee_email, or invoice items",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signee_email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate target_quantity for multiple payments
    if (
      payment_type === "multiple" &&
      (!target_quantity || target_quantity < 1)
    ) {
      return NextResponse.json(
        { message: "Target quantity must be at least 1 for multiple payments" },
        { status: 400 }
      );
    }

    const invoiceId = invoice_id
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_DEV_URL
        : process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      return NextResponse.json(
        { message: "Base URL not configured" },
        { status: 500 }
      );
    }

    const publicToken = uuidv4();
    const signingLink = `${baseUrl}/pay-invoice/${publicToken}`;

    console.log(signingLink, "signingLink");

    const { subtotal, feeAmount, totalAmount } = calculateTotals(
      invoice_items,
      fee_option
    );

    const issueDate = new Date(issue_date);

    if (isNaN(issueDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format" },
        { status: 400 }
      );
    }

    let finalLogoUrl: string | undefined = undefined;

    if (business_logo && business_logo.startsWith("data:image/")) {
      finalLogoUrl =
        (await uploadLogoToStorage(userId, business_logo)) || undefined;
      if (!finalLogoUrl) {
        console.warn("Failed to upload logo, proceeding without it");
      }
    } else if (business_logo && isValidUrl(business_logo)) {
      finalLogoUrl = business_logo;
    } else if (business_logo) {
      console.warn("Invalid logo format provided, proceeding without logo");
    }

    // Insert invoice with multiple payments support
    // NOTE: We're NOT creating a Nomba order here - payment links will be generated dynamically
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          user_id: userId,
          invoice_id: invoiceId,
          order_reference: uuidv4(),
          business_name: business_name,
          business_logo: finalLogoUrl,
          from_email: initiator_email,
          from_name: initiator_name,
          client_name: signee_name,
          client_email: signee_email,
          client_phone: clientPhone,
          bill_to: bill_to,
          issue_date: issueDate.toISOString().split("T")[0],
          status: status || "unpaid",
          payment_type: payment_type,
          fee_option: fee_option,
          allow_multiple_payments: payment_type === "multiple",
          target_quantity:
            payment_type === "multiple" ? target_quantity || 1 : 1,
          paid_quantity: 0,
          subtotal: subtotal,
          fee_amount: feeAmount,
          total_amount: totalAmount,
          paid_amount: 0,
          message: message,
          customer_note: customer_note,
          redirect_url: redirect_url,
          payment_link: signingLink,
          signing_link: signingLink,
          public_token: publicToken,
          initiator_account_number,
          initiator_account_name,
        },
      ])
      .select()
      .single();

    if (invoiceError) {
      console.error("Supabase invoice error:", invoiceError);

      if (invoiceError.code === "23505") {
        return NextResponse.json(
          { message: "Invoice with this ID already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Failed to save invoice", error: invoiceError.message },
        { status: 500 }
      );
    }

    // Insert invoice items
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      invoice_items.map((item) => ({
        invoice_id: invoice.id,
        item_description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: item.total,
      }))
    );

    if (itemsError) {
      console.error("Supabase items error:", itemsError);
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { message: "Failed to save invoice items", error: itemsError.message },
        { status: 500 }
      );
    }

    // Send email notification with view link only
    await sendInvoiceEmail({
      to: signee_email,
      subject: `New Invoice from ${initiator_name}`,
      invoiceId,
      amount: totalAmount,
      signingLink,
      senderName: initiator_name,
      message,
      businessLogo: finalLogoUrl,
      isMultiplePayments: payment_type === "multiple",
      targetQuantity: target_quantity,
    });

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        signingLink,
        invoiceId: invoice.invoice_id,
        targetQuantity: target_quantity,
        paymentType: payment_type,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { message: "Failed to create invoice", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        invoice_items (*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { message: "Failed to fetch invoices", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

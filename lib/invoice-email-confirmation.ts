import { transporter } from './node-mailer';

export async function sendPaymentSuccessEmail(
  to: string,
  invoiceId: string,
  amount: number,
  payerName: string,
  invoiceDetails: any
) {
  try {
    const subject = `Payment Confirmation - Invoice #${invoiceId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .amount { font-size: 24px; font-weight: bold; color: #10B981; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful! 🎉</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${payerName}</strong>,</p>
            <p>Your payment has been processed successfully.</p>
            
            <div class="details">
              <p><strong>Invoice ID:</strong> ${invoiceId}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">₦${amount.toLocaleString()}</span></p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Payment Status:</strong> <span style="color: #10B981;">Completed</span></p>
            </div>
            
            <p>Thank you for your business! A receipt has been generated for your records.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ Payment confirmation email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return false;
  }
}

export async function sendInvoiceCreatorNotification(
  to: string,
  invoiceId: string,
  amount: number,
  payerName: string,
  payerEmail: string,
  invoiceDetails: any
) {
  try {
    const subject = `Payment Received - Invoice #${invoiceId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .amount { font-size: 24px; font-weight: bold; color: #10B981; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received! 💰</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have received a payment for your invoice.</p>
            
            <div class="details">
              <p><strong>Invoice ID:</strong> ${invoiceId}</p>
              <p><strong>Amount Received:</strong> <span class="amount">₦${amount.toLocaleString()}</span></p>
              <p><strong>From:</strong> ${payerName} (${payerEmail})</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: #10B981;">Completed</span></p>
            </div>
            
            <p>The amount has been credited to your wallet balance.</p>
            <p>You can view the payment details in your dashboard.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ Invoice creator notification sent to: ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${to}:`, error);
    return false;
  }
}
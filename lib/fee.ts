export type FeeResult = {
  nombaFee: number;
  appFee: number;
  totalFee: number;
  totalDebit: number;
};

export function calculateFees(
  amount: number,
  type: "transfer" | "deposit" | "card",
  paymentMethod: "checkout" | "virtual_account" | "bank_transfer" = "checkout"
): FeeResult {
  const am = Number(amount) || 0;

  let nombaFee = 0;
  let appFee = 0;

  // Calculate fees based on payment method
  if (paymentMethod === "checkout") {
    // Checkout: Nomba charges 1.4% + ₦1800, we charge same to customer
    const nombaPercentage = am * 0.014; // 1.4%
    nombaFee = nombaPercentage + 1800; // + ₦1800 flat fee
    appFee = nombaFee; // Pass through to customer
  } 
  else if (paymentMethod === "virtual_account") {
    // Virtual Account: Nomba charges 0.5% (₦10 min, ₦100 cap), we charge same
    const nombaPercentage = am * 0.005; // 0.5%
    nombaFee = Math.min(Math.max(nombaPercentage, 10), 100); // Min ₦10, Max ₦100
    appFee = nombaFee; // Pass through to customer
  } 
  else if (paymentMethod === "bank_transfer") {
    // Pay by Transfer: Nomba charges 0.5% (₦20 min, ₦100 cap)
    const nombaPercentage = am * 0.005; // 0.5%
    nombaFee = Math.min(Math.max(nombaPercentage, 20), 100); // Min ₦20, Max ₦100
    
    // Zidwell charges 0.5% (₦5 min, ₦50 cap) for bank transfers
    const ourPercentage = am * 0.005; // 0.5%
    const zidwellFee = Math.min(Math.max(ourPercentage, 5), 50); // Min ₦5, Max ₦50
    
    // Customer pays BOTH Nomba fee and Zidwell fee
    appFee = nombaFee + zidwellFee;
  }

  const totalFee = appFee;
  const totalDebit = am + totalFee;

  // round to 2 decimals
  return {
    nombaFee: Math.round(nombaFee * 100) / 100,
    appFee: Math.round(appFee * 100) / 100,
    totalFee: Math.round(totalFee * 100) / 100,
    totalDebit: Math.round(totalDebit * 100) / 100,
  };
}

// Alternative function for webhook usage - calculates what we should charge vs what Nomba charges
export function calculateWebhookFees(
  amount: number,
  channel: string,
  txType: string
): { nombaFee: number; ourFee: number; ourMargin: number } {
  console.log(`💰 Webhook fee calculation for amount: ₦${amount}, channel: ${channel}, type: ${txType}`);
  
  let nombaFee = 0;
  let ourFee = 0;

  // Determine which fee structure to apply based on payment method
  if (channel === "card" || txType === "card_deposit") {
    // Checkout: Nomba charges 1.4% + ₦1800, we charge same
    const nombaPercentage = amount * 0.014; // 1.4%
    nombaFee = nombaPercentage + 1800; // + ₦1800 flat fee
    ourFee = nombaFee; // Pass through
    console.log(`   - Nomba Checkout fee (1.4% + ₦1800): ₦${nombaFee}`);
    console.log(`   - Our Checkout fee (same): ₦${ourFee}`);
  } 
  else if (channel === "virtual_account" || txType === "virtual_account_deposit") {
    // Virtual Account: Nomba charges 0.5% (₦10 min, ₦100 cap), we charge same
    const nombaPercentage = amount * 0.005; // 0.5%
    nombaFee = Math.min(Math.max(nombaPercentage, 10), 100); // Min ₦10, Max ₦100
    ourFee = nombaFee; // Pass through
    console.log(`   - Nomba VA fee (0.5%: ₦10 min, ₦100 cap): ₦${nombaFee}`);
    console.log(`   - Our VA fee (same): ₦${ourFee}`);
  } 
  else if (channel === "bank_transfer" || txType === "transfer_deposit") {
    // Pay by Transfer: Nomba charges 0.5% (₦20 min, ₦100 cap)
    const nombaPercentage = amount * 0.005; // 0.5%
    nombaFee = Math.min(Math.max(nombaPercentage, 20), 100); // Min ₦20, Max ₦100
    
    // Zidwell charges 0.5% (₦5 min, ₦50 cap) for bank transfers
    const ourPercentage = amount * 0.005; // 0.5%
    const zidwellFee = Math.min(Math.max(ourPercentage, 5), 50); // Min ₦5, Max ₦50
    
    // Customer pays BOTH Nomba fee and Zidwell fee
    ourFee = nombaFee + zidwellFee;
    
    console.log(`   - Nomba Transfer fee (0.5%: ₦20 min, ₦100 cap): ₦${nombaFee}`);
    console.log(`   - Zidwell Transfer fee (0.5%: ₦5 min, ₦50 cap): ₦${zidwellFee}`);
    console.log(`   - Total fee to customer: ₦${ourFee}`);
  } 
  else {
    // Default fallback
    console.log(`   - Unknown channel, using zero fees`);
    nombaFee = 0;
    ourFee = 0;
  }

  // Calculate our margin (profit)
  const ourMargin = Number((ourFee - nombaFee).toFixed(2));
  console.log(`   - Our margin (profit): ₦${ourMargin}`);

  return {
    nombaFee: Math.round(nombaFee * 100) / 100,
    ourFee: Math.round(ourFee * 100) / 100,
    ourMargin
  };
}

// currency formatter ₦1,000.00
export const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

// Test function to verify calculations
export function testFeeCalculations(): void {
  console.log("Testing Fee Calculations:");
  console.log("========================");
  
  const testAmounts = [100, 500, 1000, 5000, 10000, 20000];
  
  testAmounts.forEach(amount => {
    console.log(`\nFor amount: ₦${amount}`);
    console.log("-".repeat(30));
    
    const result = calculateFees(amount, "transfer", "bank_transfer");
    console.log(`Nomba Fee (0.5%, ₦20 min, ₦100 cap): ${formatNaira(result.nombaFee)}`);
    
    // Calculate Zidwell fee separately for display
    const ourPercentage = amount * 0.005;
    const zidwellFee = Math.min(Math.max(ourPercentage, 5), 50);
    console.log(`Zidwell Fee (0.5%, ₦5 min, ₦50 cap): ${formatNaira(zidwellFee)}`);
    
    console.log(`Total Fee (Nomba + Zidwell): ${formatNaira(result.totalFee)}`);
    console.log(`Total Debit: ${formatNaira(result.totalDebit)}`);
    console.log(`Zidwell Margin: ${formatNaira(zidwellFee)}`);
  });
}
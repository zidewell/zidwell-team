"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { CreditCard } from "lucide-react";

interface PayerInfo {
  fullName: string;
  email: string;
  phone: string;
}

interface PaymentFormProps {
  invoiceId: string;
  amount: number;
}

export default function PaymentForm({ invoiceId, amount }: PaymentFormProps) {
  const [payerInfo, setPayerInfo] = useState<PayerInfo>({
    fullName: "",
    email: "",
    phone: ""
  });
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handlePayerInfoChange = (field: keyof PayerInfo, value: string) => {
    setPayerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePaymentLink = async () => {
    if (!payerInfo.fullName || !payerInfo.email || !payerInfo.phone) {
      alert("Please fill in all your information before proceeding with payment.");
      return;
    }

    setIsGeneratingPayment(true);

    try {
      // Call API to generate fresh Nomba payment link
      const response = await fetch('/api/generate-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          amount: amount,
          payerName: payerInfo.fullName,
          payerEmail: payerInfo.email,
          payerPhone: payerInfo.phone,
        }),
      });

      const data = await response.json();
      if (data.success && data.paymentUrl) {
        // Redirect to the fresh Nomba payment page
        window.location.href = data.paymentUrl;
      } else {
        alert('Failed to generate payment link. Please try again.');
      }
    } catch (error) {
      console.error('Payment generation error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  return (
    <>
      {/* Payer Information Form (Shown when Pay Now is clicked) */}
      {showPaymentForm && (
        <div className="mb-6 p-6 bg-muted/30 rounded-lg border">
          <h3 className="font-semibold text-foreground mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={payerInfo.fullName}
                onChange={(e) => handlePayerInfoChange('fullName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={payerInfo.email}
                onChange={(e) => handlePayerInfoChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={payerInfo.phone}
                onChange={(e) => handlePayerInfoChange('phone', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={generatePaymentLink}
              disabled={isGeneratingPayment || !payerInfo.fullName || !payerInfo.email || !payerInfo.phone}
              className="bg-[#C29307] hover:bg-[#b38606]"
            >
              {isGeneratingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pay Now Button */}
      {!showPaymentForm && (
        <div className="mb-6">
          <Button 
            size="lg" 
            className="w-full bg-[#C29307] hover:bg-[#b38606] text-white"
            onClick={() => setShowPaymentForm(true)}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Pay Now
          </Button>
        </div>
      )}
    </>
  );
}
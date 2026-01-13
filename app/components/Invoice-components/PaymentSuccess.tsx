import { useEffect } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
// import confetti from "canvas-confetti";

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  redirectUrl?: string;
}

export const PaymentSuccessModal = ({
  open,
  onOpenChange,
  amount,
  redirectUrl,
}: PaymentSuccessModalProps) => {
  useEffect(() => {
    if (open) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
      };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // confetti({
        //   ...defaults,
        //   particleCount,
        //   origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        // });
        // confetti({
        //   ...defaults,
        //   particleCount,
        //   origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        // });
      }, 250);

      // Redirect after 4 seconds if redirectUrl is provided
      if (redirectUrl) {
        const redirectTimer = setTimeout(() => {
          window.location.href = redirectUrl;
        }, 4000);

        return () => {
          clearInterval(interval);
          clearTimeout(redirectTimer);
        };
      }

      return () => clearInterval(interval);
    }
  }, [open, redirectUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <DialogTitle className="text-2xl">Payment Successful!</DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          <div>
            <p className="text-muted-foreground mb-2">Amount Paid</p>
            <p className="text-3xl font-bold text-gold">
              ₦{amount.toLocaleString()}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              Your payment has been processed successfully. The business has
              been notified.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

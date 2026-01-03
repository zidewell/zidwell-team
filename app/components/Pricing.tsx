import { Check, Sparkles } from "lucide-react";
import { Button2 } from "./ui/button2";

const plans = [
  {
    name: "Pay Per Use",
    price: "Free",
    period: "to Join",
    description:
      "Best for: solo hustlers and side businesses who want to pay as they grow.",
    features: [
      "Free corporate account with your business name",
      "Bill Payments: Airtime, Data, Electricity, Cable (Government stamp duty fees apply)",
      "Invoices/payment links: 10 free monthly then ₦100/1 + 2% per paid invoice (the payee pays this not you) capped at N2000",
      "Receipts: 10 free monthly then ₦100/1",
      "Simple Contracts: ₦1,000 each",
<<<<<<< HEAD
      "Lawyer-signed Contracts: ₦10,000 each",
      "Tax Filing Support: 3% of monthly revenue",
      "Cashback: ₦20 per ₦2,500 spent",
      "Referral Rewards: ₦20 per signup",
=======
      "Simple Contracts with a lawyer's signature: ₦11,000 each (binding with or without a lawyer)",
      "Tax Filing Support:",
      "  • Annual returns ₦80k or Zidwell elite plan",
      "  • Monthly Routine tax filing ₦50k or Zidwell premium plan",
      "  • Tax advisory Session - ₦50k/hr",
      "  • Comprehensive Tax Audit - ₦500k+",
      "  Note: cost includes basic accounting/bookkeeping, financial statement, filing tax + tax receipt",
      "Wallet Charges:",
      "  • Free virtual bank account creation",
      "  • Deposit fee: 0.50% capped at ₦100",
      "  • Transfer fee: 1% capped at ₦150",
      "Cashback: ₦20 back for every ₦2,500 spent on data, airtime, cable and electricity bill payment",
      "Referral Rewards: ₦20 for signups done with your referral code",
      "Referral Transaction Rewards: ₦20 for every ₦10,000 spent by the person you referred",
>>>>>>> fa815ffaf16f3689f1fe15a81ad9aa34f05247dd
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₦20,000",
    period: "/month",
    yearlyPrice: "₦200,000/year (save ₦40k)",
    description:
      "Best for: growing businesses that want structure without stress. Everything you need to run your business finances properly.",
    features: [
      "Includes everything in Free, plus:",
      "Zero transaction fees",
      "Unlimited invoices & receipts",
      "Invoice payment reminders",
      "Add 1 User assistant",
      "Free Monthly Financial Wellness Clinic (included)",
      "Active WhatsApp business community",
      "Business tools dashboard",
      "Priority support",
      "",
      "Ideal if: you want clarity, compliance, and consistency in your business finances.",
    ],
    cta: "Start Growth Plan",
    highlight: false,
  },
  {
    name: "Premium",
    price: "₦50,000",
    period: "/month",
    yearlyPrice: "₦500,000/year (save ₦100k)",
    description:
      "Best for: founders and CEOs who want to move the burden of financial management to someone else.",
    features: [
      "Includes everything in Growth, plus:",
      "Accounting & bookkeeping support (monthly)",
      "Tax management support (filing assistance)",
      "Business SOP templates",
      "Unlimited contract creation",
      "24/7 business support access",
      "Deeper financial insights & reporting",
      "Priority access to all Zidwell events",
      "",
      "Ideal if: you're scaling and need support beyond tools — real guidance.",
    ],
    cta: "Start Premium",
    highlight: true,
  },
  {
    name: "Elite",
    price: "₦100,000",
    period: "/month",
    yearlyPrice: "Customized pricing available",
    description:
      "Best for: established businesses, founders, and teams that want hands-on support. This is not software. This is a finance and business partner.",
    features: [
      "Includes everything in Premium, plus:",
      "Quarterly business/finance analyst consultation",
      "Dedicated bookkeeping review",
      "Advanced tax planning & advisory",
      "Dedicated account manager",
      "Full accounting & bookkeeping management",
      "End-to-end tax handling",
      "Business management support",
      "One-on-one consulting sessions",
      "Custom SOPs & operational frameworks",
      "Strategic financial planning",
      "Private consultant access",
      "Custom team & enterprise solutions",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const Pricing = () => {
  return (
    <section
      id="pricing"
      className="py-20 md:py-32 bg-gray-100/30 dark:bg-gray-900/30"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-gray-900 dark:text-gray-50">
            Simple plans that <span className="text-[#C29307]">grow</span> with
            you
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Start free, upgrade when you're ready
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col ${
                plan.highlight
                  ? "bg-[#C29307] text-gray-900 border-2 border-gray-900 dark:border-gray-50 shadow-[6px_6px_0px_#111827] dark:shadow-[6px_6px_0px_#fbbf24]"
                  : "bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24]"
              } p-6 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#fbbf24] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-xl font-bold mb-2 ${
                    plan.highlight
                      ? "text-gray-900"
                      : "text-gray-900 dark:text-gray-50"
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-black ${
                      plan.highlight
                        ? "text-gray-900"
                        : "text-gray-900 dark:text-gray-50"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlight
                        ? "text-gray-900/70"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                {plan.yearlyPrice && (
                  <p
                    className={`text-xs mt-1 ${
                      plan.highlight
                        ? "text-gray-900/70"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {plan.yearlyPrice}
                  </p>
                )}
                <p
                  className={`text-sm mt-3 ${
                    plan.highlight
                      ? "text-gray-900/80"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {feature.startsWith("  •") || feature.startsWith("Note:") || feature.startsWith("Ideal if:") ? (
                      <span className="w-4 shrink-0"></span>
                    ) : feature.startsWith("Tax Filing Support:") || 
                       feature.startsWith("Wallet Charges:") || 
                       feature.startsWith("Includes everything") ? (
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.highlight ? "text-gray-900" : "text-[#C29307]"
                        }`}
                      />
                    ) : (
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.highlight ? "text-gray-900" : "text-[#C29307]"
                        }`}
                      />
                    )}
                    <span
                      className={`${feature.startsWith("  •") || feature.startsWith("Note:") || feature.startsWith("Ideal if:") ? "pl-4 text-xs" : ""} ${
                        plan.highlight
                          ? "text-gray-900"
                          : "text-gray-900 dark:text-gray-50"
                      } ${feature === "" ? "h-2" : ""}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button2
                variant={plan.highlight ? "heroOutline" : "default"}
                className={`w-full ${
                  plan.highlight
                    ? "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : ""
                }`}
              >
                {plan.cta}
              </Button2>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
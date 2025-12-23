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
      "Bill Payments: Airtime, Data, Electricity, Cable",
      "10 free invoices/receipts monthly",
      "Simple Contracts: ₦1,000 each",
      "Lawyer-signed Contracts: ₦11,000 each",
      "Tax Filing Support: 3% of monthly revenue",
      "Cashback: ₦20 per ₦2,500 spent",
      "Referral Rewards: ₦20 per signup",
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
      "Best for: growing businesses that want structure without stress.",
    features: [
      "Everything in Free, plus:",
      "Unlimited invoices, receipts & contracts",
      "Business SOP templates",
      "Business growth templates",
      "Brand & marketing templates",
      "Monthly Financial Wellness Workshops",
      "Monthly Financial Wellness Clinic",
      "Active WhatsApp business community",
      "Business tools dashboard",
      "Priority support",
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
      "Best for: founders and CEOs who want both business performance and personal wellness.",
    features: [
      "Everything in Growth, plus:",
      "Zero transaction fees",
      "Monthly accounting & bookkeeping support",
      "Tax management support (filing assistance)",
      "Monthly mental health & group therapy",
      "Quarterly business/finance consultant",
      "Personal growth coaching sessions",
      "CEO Wellness Wave program",
      "24/7 business support access",
      "Deeper financial insights & reporting",
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
      "Best for: established businesses, founders, and teams that want hands-on support.",
    features: [
      "Everything in Premium, plus:",
      "Dedicated bookkeeping review",
      "Advanced tax planning & advisory",
      "Dedicated account manager",
      "Full accounting & bookkeeping management",
      "End-to-end tax handling",
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

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.highlight ? "text-gray-900" : "text-[#C29307]"
                      }`}
                    />
                    <span
                      className={
                        plan.highlight
                          ? "text-gray-900"
                          : "text-gray-900 dark:text-gray-50"
                      }
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

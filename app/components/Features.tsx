import {
  CreditCard,
  Receipt,
  FileText,
  Upload,
  Wallet,
  Users,
  Gift,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Pay Bills with Ease",
    description: "Handle bills for you and your staff seamlessly in one place.",
  },
  {
    icon: Gift,
    title: "Earn Cashback & Rewards",
    description:
      "Get rewarded for every transaction with ZidCoins and referral bonuses.",
  },
  {
    icon: Receipt,
    title: "Professional Receipts & Invoices",
    description:
      "Create professional documentation for every transaction automatically.",
  },
  {
    icon: FileText,
    title: "Simple Agreements",
    description:
      "Generate contracts and agreements to protect your business deals.",
  },
  {
    icon: Upload,
    title: "Tax Support",
    description: "Upload bank statements and get your taxes handled with ease.",
  },
  {
    icon: Wallet,
    title: "Prepaid Debit Cards",
    description:
      "Access prepaid cards for everyday business and personal spending.",
  },
  {
    icon: Users,
    title: "Growth Community",
    description:
      "Join a community focused on growth, structure, and smarter money habits.",
  },
  {
    icon: Shield,
    title: "Secure & Protected",
    description:
      "Your money is safe with regulated partners and standard security practices.",
  },
];

const Features = () => {
  return (
    <section
      id="features"
      className="py-20 md:py-32 bg-gray-100/30 dark:bg-gray-900/30"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-gray-900 dark:text-gray-50">
            What <span className="text-[#C29307]">Zidwell</span> Does
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Zidwell is more than a payment app. It's a financial wellness
            platform designed for real life and real businesses.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-gray-50 p-6 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#fbbf24] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="w-12 h-12 bg-[#C29307] border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] flex items-center justify-center mb-4 group-hover:bg-amber-400 transition-colors">
                <feature.icon className="w-6 h-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-50">
                {feature.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Text */}
        <div className="max-w-2xl mx-auto text-center mt-16">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Everything you need to manage your business finances —{" "}
            <span className="text-[#C29307]">without the stress.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Features;

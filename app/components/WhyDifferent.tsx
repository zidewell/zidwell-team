import { Heart, BookOpen, Headphones } from "lucide-react";

const WhyDifferent = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-gray-900 dark:text-gray-50">
              Why We're{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Different</span>
                <span className="absolute bottom-2 left-0 right-0 h-4 bg-[#C29307]/40 -z-0" />
              </span>
            </h2>

            <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
              Most fintech apps focus on transactions.{" "}
              <strong className="text-gray-900 dark:text-gray-50">
                Zidwell focuses on financial wellbeing.
              </strong>
            </p>

            <p className="text-gray-500 dark:text-gray-400 mb-8">
              We believe money should work for you, not confuse you. That's why
              Zidwell combines tools, education, and support into one simple
              experience. Instead of juggling multiple apps for payments,
              records, and advice, Zidwell gives you one place to manage, grow,
              and protect your money.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#C29307] border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-gray-900 dark:text-gray-50">
                    Finance with Context
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Understanding your unique Nigerian business needs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#C29307] border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-gray-900 dark:text-gray-50">
                    Structure with Support
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Not just tools, but guidance when you need it
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#C29307] border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-gray-900 dark:text-gray-50">
                    Technology with Heart
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Built by people who understand your journey
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-gray-50 shadow-[6px_6px_0px_#111827] dark:shadow-[6px_6px_0px_#fbbf24] p-8 md:p-12">
              <div className="space-y-6">
                {/* Before/After Comparison */}
                <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Before Zidwell
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Payment App",
                      "Invoice Tool",
                      "Tax Software",
                      "Banking App",
                      "Spreadsheets",
                    ].map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    5+ apps, endless confusion
                  </p>
                </div>

                <div>
                  <span className="text-sm font-bold text-[#C29307] uppercase tracking-wider">
                    With Zidwell
                  </span>
                  <div className="mt-3">
                    <span className="px-6 py-3 bg-[#C29307] text-gray-900 border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] font-bold inline-block">
                      One Platform. Everything.
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Clarity, control, and confidence
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#C29307] border-2 border-gray-900 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24]" />
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gray-900 dark:bg-gray-50" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyDifferent;

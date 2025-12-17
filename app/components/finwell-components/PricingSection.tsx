"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Star, Zap, Crown, Diamond, Router } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Business Starter",
    price: "Free",
    period: "",
    icon: Star,
    popular: false,
    description: "Perfect for entrepreneurs just getting started",
    features: [
      { name: "Monthly Financial Wellness Workshops", included: true },
      { name: "Founders Finance Friday", included: true },
      { name: "Weekly Live Q&A Sessions", included: true },
      { name: "Active WhatsApp Community", included: true },
      { name: "Weekly Hustle Culture Podcast", included: true },
    ],
    cta: "Join Free",
    url: "#",
  },
  {
    name: "Starter",
    price: "₦50k",
    period: "/month",
    icon: Zap,
    popular: false,
    description: "For entrepreneurs ready to get organized",
    features: [
      { name: "Everything in Free, plus:", included: true },
      { name: "CEO Wellness Wave Access", included: true },
      { name: "Business Tools Access", included: true },
      { name: "Tax Management Guide", included: true },
      { name: "Business SOP Templates", included: true },
      { name: "Business Growth Templates", included: true },
      { name: "Spiritual Growth Coaching", included: true },
    ],
    cta: "Get Started",
    url: "https://checkout.mainstack.co/coach/yXQprx-38qNk?currency=NGN",
  },
  {
    name: "Premium CEO",
    price: "₦150k",
    period: "/month",
    icon: Crown,
    popular: true,
    description: "For serious entrepreneurs ready to scale",
    features: [
      { name: "Everything in Starter, plus:", included: true },
      { name: "Accounting & Bookkeeping Support", included: true },
      { name: "Brand & Marketing Templates", included: true },
      { name: "Monthly Mental Health Assessment", included: true },
      { name: "Personal Growth Coaching", included: true },
      { name: "24/7 Business Support", included: true },
    ],
    cta: "Go Premium",
    url: "https://checkout.mainstack.co/coach/yXQprx-38qNk?currency=NGN",
  },
  {
    name: "Diamond CEO",
    price: "₦250k",
    period: "/month",
    icon: Diamond,
    popular: false,
    description: "Ultimate package for CEOs who want it all",
    features: [
      { name: "Everything in Premium CEO, plus:", included: true },
      { name: "Monthly Content Calendar", included: true },
      { name: "Monthly Content Creation", included: true },
      { name: "VIP Event Access", included: true },
      { name: "Executive Networking Group", included: true },
      { name: "Dedicated Success Manager", included: true },
    ],
    cta: "Go Diamond",
    url: "https://checkout.mainstack.co/coach/yXQprx-38qNk?currency=NGN",
  },
];

const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const router = useRouter();

  return (
    <section id="pricing" className="section-padding bg-background" ref={ref}>
      <div className=" px-4 md:px-6 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full text-gradient-green font-medium text-sm bg-[#E7F2EB] mb-4">
            Pricing Plans
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Flexible Plans for Every{" "}
            <span className="text-gradient-green">Stage of Growth</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            FinWell Club creates multiple touchpoints for learning, connection,
            and growth. Choose the plan that fits your business journey.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto ">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className={`relative p-6 rounded-3xl ${
                plan.popular
                  ? "bg-primary text-primary-foreground shadow-glow lg:scale-105"
                  : "bg-background border-2 border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-sm font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  plan.popular ? "bg-accent" : "bg-primary/10"
                }`}
              >
                <plan.icon
                  className={`w-6 h-6 ${
                    plan.popular ? "text-accent-foreground" : "text-primary"
                  }`}
                />
              </div>

              <h3
                className={`font-display text-xl font-bold mb-2 ${
                  plan.popular ? "" : "text-foreground"
                }`}
              >
                {plan.name}
              </h3>

              <p
                className={`text-sm mb-4 ${
                  plan.popular
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="font-display text-3xl font-bold">
                  {plan.price}
                </span>
                <span
                  className={
                    plan.popular
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }
                >
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.popular ? "text-accent" : "text-primary"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.popular
                          ? "text-primary-foreground/90"
                          : "text-muted-foreground"
                      }`}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() =>
                  window.open(plan.url || "#", "_blank", "noopener,noreferrer")
                }
                className={`w-full ${
                  plan.popular
                    ? "bg-accent hover:bg-accent-light text-accent-foreground"
                    : "bg-primary hover:bg-primary-dark text-primary-foreground"
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

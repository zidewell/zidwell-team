"use client";

import { useEffect } from "react";
import AboutSection from "./components/finance-landing-components/AboutSection";
import ClienteleSection from "./components/finance-landing-components/ClientelSection";
import CTASection from "./components/finance-landing-components/CTASection";
import Footer from "./components/finance-landing-components/Footer";
import HeroSection from "./components/finance-landing-components/HeroSection";
import Navbar from "./components/finance-landing-components/Navbar";
import PricingSection from "./components/finance-landing-components/PricingSection";
import ProcessSection from "./components/finance-landing-components/ProcessSection";
import ServicesSection from "./components/finance-landing-components/ServicesSection";
import TestimonialsSection from "./components/finance-landing-components/TestimonialsSection";
import WhyUsSection from "./components/finance-landing-components/WhyUseSection";
import Aos from "aos";

const page = () => {
  useEffect(() => {
    Aos.init({
      duration: 800,
      once: true,
    });
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <ClienteleSection />
        <ServicesSection />
        <ProcessSection />
        <PricingSection />
        <TestimonialsSection />
        <WhyUsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default page;

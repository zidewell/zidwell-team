// import AboutSection from "../components/finance-landing-components/AboutSection";
// import ClienteleSection from "../components/finance-landing-components/ClientelSection";
// import CTASection from "../components/finance-landing-components/CTASection";
// import Footer from "../components/finance-landing-components/Footer";
// import HeroSection from "../components/finance-landing-components/HeroSection";
// import Navbar from "../components/finance-landing-components/Navbar";
// import PricingSection from "../components/finance-landing-components/PricingSection";
// import ProcessSection from "../components/finance-landing-components/ProcessSection";
// import ServicesSection from "../components/finance-landing-components/ServicesSection";
// import TestimonialsSection from "../components/finance-landing-components/TestimonialsSection";
// import WhyUsSection from "../components/finance-landing-components/WhyUseSection";

// const page = () => {
//   return (
//     <div className="min-h-screen bg-background">
//       <Navbar />
//       <main>
//         <HeroSection />
//         <AboutSection />
//         <ClienteleSection />
//         <ServicesSection />
//         <ProcessSection />
//         <PricingSection />
//         <TestimonialsSection />
//         <WhyUsSection />
//         <CTASection />
//       </main>
//       <Footer />
//     </div>
//   );
// };

// export default page;


"use client";
import CTA from "../components/CTA";
import Features from "../components/Features";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Testimonials from "../components/Testimonials";
import AOS from 'aos';
import { useEffect } from "react";
import 'aos/dist/aos.css'; 
import Pricing from "../components/Pricing";
import WhyDifferent from "../components/WhyDifferent";
import HowItWorks from "../components/HowItWorks";
import WhyChoose from "../components/WhyChoose";
import ZidCoin from "../components/ZisCoin";
import FAQ from "../components/Faq";

const page = () => {
 

useEffect(() => {
  AOS.init({
    duration: 800, 
    once: true,    
  });
}, []);

  return (
   <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 overflow-x-hidden">
      <Header />
      <Hero />
      <Features />
      <WhyDifferent />
      <HowItWorks />
      <WhyChoose />
      <Testimonials />
      <Pricing />
      <ZidCoin />
      <FAQ />
      <CTA />
      <Footer />
    </main>

  );
};

export default page;
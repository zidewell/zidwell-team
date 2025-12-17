"use client"
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "../components/finwell-components/SplashScreen"; 
import Navbar from "../components/finwell-components/Navbar"; 
import HeroSection from "../components/finwell-components/HeroSection"; 
import AboutSection from "../components/finwell-components/AboutSection"; 
import ProblemSection from "../components/finwell-components/ProblemSection"; 
import MissionSection from "../components/finwell-components/MissionSection"; 
import PricingSection from "../components/finwell-components/PricingSection"; 
import ImpactSection from "../components/finwell-components/ImpactSection"; 
import EventsSection from "../components/finwell-components/EventsSection"; 
import PartnershipSection from "../components/finwell-components/PartnershipSection"; 
import FounderSection from "../components/finwell-components/FounderSection"; 
import Footer from "../components/finwell-components/Footer"; 
import "../finwell.css";
const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Preload images
    const images = [
      "/public/hero-woman.jpg",
      "/public/hero-man.jpg",
      "/public/community.jpg",
      "/public/founder.jpg",
    ];
    
    Promise.all(
      images.map(src => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        });
      })
    ).then(() => setIsReady(true));
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <main className="overflow-hidden">
          <Navbar />
          <HeroSection />
          <AboutSection />
          <ProblemSection />
          <MissionSection />
          <PricingSection />
          <ImpactSection />
          <EventsSection />
          <PartnershipSection />
          <FounderSection />
          <Footer />
        </main>
      )}
    </>
  );
};

export default Index;

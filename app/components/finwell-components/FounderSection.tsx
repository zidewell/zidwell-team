"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Linkedin, Instagram, Headphones, Music, BookOpen } from "lucide-react";
import founderImg from "@/public/founder.jpg";
import Image from "next/image";

const FounderSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding bg-gradient-section" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1 rounded-full text-[#117E39] bg-[#E7F2EB] font-medium text-sm mb-4">
              The Visioner
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Meet Our Founder
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-12 bg-background rounded-3xl shadow-soft border border-border"
          >
            {/* Image */}
            <div className="relative shrink-0">
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden">
                <Image
                  src={founderImg}
                  alt="Coach Attah - Founder of FinWell Club"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-accent rounded-2xl -z-10" />
            </div>

            {/* Content */}
            <div className="text-center md:text-left">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Coach Attah
              </h3>
              <p className="text-primary font-medium mb-4">
                Founder, FinWell Club
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                <span className="px-3 py-1 text-[#117E39] bg-[#E7F2EB] text-sm font-medium rounded-full">
                  Business Consultant
                </span>
                <span className="px-3 py-1 bg-[#FAEFCE] text-accent-foreground text-sm font-medium rounded-full">
                  Finance Coach
                </span>
                <span className="px-3 py-1 bg-charcoal text-primary-foreground text-sm font-medium rounded-full">
                  Bible Study Teacher
                </span>
              </div>

              <p className="text-muted-foreground mb-6">
                Coach Attah brings real-world entrepreneurship experience and a
                heart for community building. With a passion for holistic
                development, he founded FinWell Club to address the gap between
                business potential and financial wellness in African
                entrepreneurship.
              </p>

              <div className="flex justify-center md:justify-start gap-3 flex-wrap">
                <a
                  href="#"
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Apple Podcasts"
                >
                  <Headphones className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Spotify"
                >
                  <Music className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Medium"
                >
                  <BookOpen className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;

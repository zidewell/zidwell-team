"use client"
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import communityImg from "@/public/community.jpg";
import Image from "next/image";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="section-padding bg-background" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden">
              <Image
                src={communityImg} 
                alt="FinWell Club community members networking" 
                className="w-full h-[400px] md:h-[500px] object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-charcoal/60 to-transparent" />
              
              {/* Quote overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <p className="font-display text-xl md:text-2xl font-bold text-primary-foreground italic">
                  "Every business owner deserves access to financial tools, education, and community."
                </p>
              </div>
            </div>
            
            {/* Decorative badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="absolute -top-6 -right-6 bg-accent text-accent-foreground rounded-2xl p-4 shadow-gold hidden md:block"
            >
              <p className="font-display text-3xl font-bold">500+</p>
              <p className="text-sm font-medium">Active Members</p>
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#E7F2EB] text-[#117E39] font-medium text-sm mb-4 ">
              Who We Are
            </span>
            
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              A Nonprofit Financial Wellness{" "}
              <span className="text-gradient-green">Community</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-6">
              FinWell Club is dedicated to empowering founders, CEOs and freelancers with the knowledge, tools, and support they need to achieve their financial goals and build sustainable businesses.
            </p>
            
            <p className="text-lg text-muted-foreground mb-8">
              We believe that every business owner deserves access to financial tools, education, and a supportive community that enables them to achieve their God-given vision on earth.
            </p>

            {/* Values quick list */}
            <div className="grid grid-cols-2 gap-4">
              {[
                "Community Support",
                "Financial Education",
                "Practical Tools",
                "Holistic Wellness"
              ].map((value, index) => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span className="text-foreground font-medium">{value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

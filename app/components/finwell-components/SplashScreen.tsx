"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import heroWoman from "@/public/hero-woman.jpg";
import heroMan from "@/public/hero-man.jpg";
import Image from "next/image";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-gradient-hero flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary-light rounded-full blur-3xl"
        />
      </div>

      {/* Logo and content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 text-center px-4"
      >
        {/* Logo icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="mx-auto mb-6 w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-gold"
        >
          <span className="font-display text-4xl font-bold text-foreground">
            F
          </span>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
        >
          FinWell Club
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-lg md:text-xl text-white max-w-md mx-auto mb-12"
        >
          Building Financial Wellness. Together.
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "240px", opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
          className="mx-auto h-1 bg-primary-foreground/20 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-accent rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="mt-4 text-sm text-white/60"
        >
          Growing your financial future...
        </motion.p>
      </motion.div>

      {/* Floating images */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 0.3 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute left-10 bottom-20 w-32 h-40 rounded-2xl overflow-hidden hidden lg:block"
      >
        <Image src={heroWoman} alt="" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 0.3 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="absolute right-10 top-20 w-32 h-40 rounded-2xl overflow-hidden hidden lg:block"
      >
        <Image src={heroMan} alt="" className="w-full h-full object-cover" />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;

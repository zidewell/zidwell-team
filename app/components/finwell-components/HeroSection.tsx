import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "../ui/button";
import heroWoman from "@/public/hero-woman.jpg";
import heroMan from "@/public/hero-man.jpg";
import Image from "next/image";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-section -z-10" />

      {/* Decorative elements */}
      <div className="absolute top-40 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full  border bg-[#E6F1EA] mb-6"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#117E39]">
                Join 500+ Business Owners
              </span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] mb-6">
              Growth starts when you move from{" "}
              <span className="text-gradient-green">chaos to clarity</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8">
              The Financial Wellness Club gives you the tools and support to
              grow as a business owner. Build sustainable, profitable businesses
              that create jobs and drive economic growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-5">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-dark text-primary-foreground font-semibold px-8 group"
              >
                Join the Community
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-foreground/20 hover:bg-foreground/5 shadow-md group"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Our Story
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-border">
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  500+
                </p>
                <p className="text-sm text-muted-foreground">Business Owners</p>
              </div>
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-accent">
                  5+
                </p>
                <p className="text-sm text-muted-foreground">
                  Workshops Hosted
                </p>
              </div>
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  100%
                </p>
                <p className="text-sm text-muted-foreground">
                  Community Driven
                </p>
              </div>
            </div>
          </motion.div>

          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main image */}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="relative z-10 rounded-3xl overflow-hidden shadow-elevated"
              >
                <Image
                  src={heroWoman}
                  alt="Successful Black female business owner"
                  className="w-full h-[400px] md:h-[500px] object-cover"
                />
                {/* Overlay badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-2xl p-4">
                  <p className="font-display font-bold text-gray-100">
                    Building financial wellness
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Together, we grow stronger
                  </p>
                </div>
              </motion.div>

              {/* Secondary image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="absolute -bottom-8 -left-8 w-40 h-48 rounded-2xl overflow-hidden shadow-soft border-4 border-background z-20 hidden md:block"
              >
                <Image
                  src={heroMan}
                  alt="Successful Black male entrepreneur"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent rounded-2xl -z-10 animate-float" />
              <div className="absolute -bottom-4 -right-12 w-32 h-32 bg-primary/20 rounded-full -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "About", href: "#about" },
    { name: "Problem", href: "#problem" },
    { name: "Mission", href: "#mission" },
    { name: "Pricing", href: "#pricing" },
    { name: "Impact", href: "#impact" },
    { name: "Events", href: "#events" },
  ];

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        scrolled
          ? "bg-background/95 backdrop-blur-lg border-b border-gray-300"
          : "bg-background/80 backdrop-blur-md"
      } transition-all duration-300`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex  items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setIsOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="font-display text-xl font-bold text-primary-foreground">
                F
              </span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              FinWell Club
            </span>
          </a>

          {/* Desktop Navigation - Visible only on medium screens and up */}
          <div className="hidden  md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hover:scale-105"
              >
                {item.name}
              </button>
            ))}
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary-dark transition-colors"
              onClick={() => {
                console.log("Join Now clicked");
                // Handle join now action
              }}
            >
              Join Now
            </Button>
          </div>

          {/* Mobile Menu Button - Hidden on medium screens and up */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation - Hidden on medium screens and up */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-border bg-background">
                <div className="flex flex-col gap-4">
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.href)}
                      className="text-base font-medium text-muted-foreground hover:text-primary transition-colors text-left py-2 px-2 hover:bg-muted rounded-md"
                    >
                      {item.name}
                    </button>
                  ))}
                  <Button
                    variant="default"
                    className="w-full bg-primary hover:bg-primary-dark text-primary-foreground mt-4"
                    onClick={() => {
                      setIsOpen(false);
                      console.log("Join Now clicked");
                    }}
                  >
                    Join Now
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
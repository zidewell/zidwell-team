"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button2 } from "../ui/button2";
import ConsultationModal from "./ConsultationModal"; 

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);

  const navLinks = [
    { label: "Blog", href: "/#", type: "link" },
    { label: "Talk to Expert", href: "#talk-to-expert", type: "action" },
    { label: "Book a Call", href: "#book-a-call", type: "action" },
  ];

  const handleActionClick = () => {
    setIsConsultationOpen(true);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Side: Logo and Auth Buttons (Desktop) */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Zidwell Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain border-2 dark:border-gray-50 shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#fbbf24] bg-black dark:bg-gray-950 p-1 border-[#C29307]"
                />
                <span className="font-black text-xl tracking-tight text-gray-900 dark:text-gray-50">
                  Zidwell
                </span>
              </Link>

              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Button2
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/auth/login">Sign In</Link>
                </Button2>
                <Button2
                  variant="heroOutline"
                  size="sm"
                  className="text-sm"
                  asChild
                >
                  <Link href="/app">Go to App</Link>
                </Button2>
              </div>
            </div>

            {/* Right Side: Navigation Links (Desktop) */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <div key={link.label}>
                  {link.type === "link" ? (
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      {link.label}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                    </Link>
                  ) : (
                    <button
                      onClick={handleActionClick}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      {link.label}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t-2 border-foreground py-4 animate-fade-in">
              <div className="flex flex-col gap-4">
                {/* Mobile Auth Buttons */}
                <div className="flex flex-col gap-3 pb-4 border-b border-gray-200">
                  <Button2
                    variant="ghost"
                    className="w-full justify-start text-base"
                    asChild
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Link href="/auth/login">Sign In</Link>
                  </Button2>
                  <Button2
                    className="w-full justify-start text-base"
                    asChild
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Link href="/">Go to App</Link>
                  </Button2>
                </div>

                {/* Mobile Navigation Links using same navLinks data */}
                {navLinks.map((link) => (
                  <div key={link.label}>
                    {link.type === "link" ? (
                      <Link
                        href={link.href}
                        className="text-lg font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <button
                        onClick={handleActionClick}
                        className="text-lg font-medium py-2 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                      >
                        {link.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Consultation Modal */}
      <ConsultationModal 
        open={isConsultationOpen} 
        onOpenChange={setIsConsultationOpen} 
      />
    </>
  );
};

export default Navbar;
import { motion } from "framer-motion";
import { ArrowRight, Mail, Phone, MapPin, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import { Button } from "../ui/button"; 

const Footer = () => {
  return (
    <footer className="bg-charcoal text-primary-foreground">
      {/* CTA Section */}
      <div className="section-padding ">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Transform Your{" "}
              <span className="text-gradient-gold">Financial Future?</span>
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join a community of 500+ business owners who are building sustainable, profitable businesses together.
            </p>
            <Button size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground font-semibold px-8 group">
              Join FinWell Club Today
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                  <span className="font-display text-xl font-bold text-accent-foreground">F</span>
                </div>
                <span className="font-display text-xl font-bold">FinWell Club</span>
              </div>
              <p className="text-primary-foreground/70 max-w-md mb-6">
                A nonprofit financial wellness community dedicated to empowering founders, CEOs and freelancers with the knowledge, tools, and support they need to achieve their financial goals.
              </p>
              <p className="text-sm text-primary-foreground/50">
                Powered by <span className="text-accent font-medium">Zidwell Finance</span>
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {["About Us", "Our Mission", "Pricing", "Events", "Impact", "Contact"].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-display text-lg font-bold mb-6">Get In Touch</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-accent" />
                  <a href="mailto:hello@finwellclub.com" className="text-primary-foreground/70 hover:text-accent transition-colors">
                    hello@finwellclub.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-accent" />
                  <a href="tel:+2341234567890" className="text-primary-foreground/70 hover:text-accent transition-colors">
                    +234 123 456 7890
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-accent shrink-0" />
                  <span className="text-primary-foreground/70">
                    10 Hughes Avenue, Yaba, Lagos, Nigeria
                  </span>
                </li>
              </ul>

              {/* Social Links */}
              <div className="flex gap-4 mt-6">
                {[Instagram, Facebook, Youtube, Linkedin].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-foreground/50">
              © 2024 FinWell Club. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

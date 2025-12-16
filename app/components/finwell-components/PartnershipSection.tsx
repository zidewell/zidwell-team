"use client"
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Handshake, Gift, HeartHandshake } from "lucide-react";
import { Button } from "../ui/button"; 

const opportunities = [
  {
    icon: Handshake,
    title: "Event Sponsorship",
    description: "Support our monthly workshops, Founders Finance Friday events, or quarterly wellness hangouts.",
    benefits: ["Brand visibility", "Speaking opportunities", "Podcast feature", "Community access"]
  },
  {
    icon: Gift,
    title: "Grant Funding",
    description: "Support specific initiatives like our Tax Season Bootcamp, business evaluation tool development, or expansion.",
    benefits: ["Named programs", "Impact reports", "Recognition", "Custom partnerships"]
  },
  {
    icon: HeartHandshake,
    title: "In-Kind Donations",
    description: "Contribute services such as graphic design, video production, legal support, or accounting services.",
    benefits: ["Community recognition", "Networking access", "Social impact", "Brand alignment"]
  }
];

const PartnershipSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding bg-background" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent text-accent-foreground font-medium text-sm mb-4">
            Partner With Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Partnership Opportunities
          </h2>
          <p className="text-lg text-muted-foreground">
            We welcome partnerships with organizations that share our commitment to empowering Nigerian entrepreneurs.
          </p>
        </motion.div>

        {/* Partnership cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {opportunities.map((opp, index) => (
            <motion.div
              key={opp.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
              className="p-8 rounded-3xl bg-background border-2 border-border hover:border-primary/50 transition-colors group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <opp.icon className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="font-display text-xl font-bold text-foreground mb-3">{opp.title}</h3>
              <p className="text-muted-foreground mb-6">{opp.description}</p>
              
              <ul className="space-y-2 mb-6">
                {opp.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Learn More
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnershipSection;

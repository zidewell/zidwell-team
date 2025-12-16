"use client"
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Eye, Heart, Users, Wrench, Shield } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "Community Over Competition",
    description: "We foster collaboration, peer support, and genuine relationships over transactional networking or competition."
  },
  {
    icon: Wrench,
    title: "Practical Over Theory",
    description: "We teach actionable business strategies you can apply immediately—no jargon, no fluff, just real solutions."
  },
  {
    icon: Heart,
    title: "Holistic Wellness",
    description: "Financial wellness is connected to your spiritual, mental and physical health. We support your growth as a human."
  },
  {
    icon: Shield,
    title: "Integrity & Transparency",
    description: "We operate with honesty, accountability, and a genuine commitment to every member of our community."
  }
];

const MissionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="mission" className="section-padding bg-gradient-section" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Mission & Vision */}
        <div className="grid lg:grid-cols-2 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="p-8 md:p-10 rounded-3xl bg-primary text-primary-foreground"
          >
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-4">Our Mission</h3>
            <p className="text-lg text-primary-foreground/90">
              To simplify the art of entrepreneurship by taking holistic care of the business owner themselves—spirit, soul, and body.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="p-8 md:p-10 rounded-3xl bg-background border border-[#c1d9ca]"
          >
            <div className="w-14 h-14 bg-[#E7F2EB] text-[#117E39] rounded-2xl flex items-center justify-center mb-6">
              <Eye className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Our Vision</h3>
            <p className="text-lg text-muted-foreground">
              To build a supportive community where founders, CEOs and freelancers can learn, grow, and thrive together to build sustainable, profitable businesses that create jobs, drive economic growth, and improve lives.
            </p>
          </motion.div>
        </div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 rounded-full  text-accent-foreground font-medium text-sm mb-4 bg-accent">
            Core Values
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground ">
            What We Stand For
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              className="group p-6 rounded-2xl bg-background border border-border hover:border-primary/50 hover:shadow-soft transition-all"
            >
              <div className="w-12 h-12 bg-[#E7F2EB] text-[#117E39] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#D4E8D9] transition-colors">
                <value.icon className="w-6 h-6 text-[#117E39]" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">{value.title}</h3>
              <p className="text-muted-foreground text-sm">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionSection;

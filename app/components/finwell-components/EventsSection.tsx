"use client"
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, Clock, Video, MessageCircle, Users, Mic, Trophy, Dumbbell } from "lucide-react";

const monthlyEvents = [
  { week: "Week 1", event: "Virtual Financial Workshop", day: "Every 1st Wednesday", icon: Video },
  { week: "Week 2", event: "Live Q&A Sessions", day: "Instagram/Facebook/WhatsApp", icon: MessageCircle },
  { week: "Week 3", event: "Hustle Culture Podcast", day: "New Episode Release", icon: Mic },
  { week: "Week 4", event: "Founders Finance Friday", day: "Last Friday", icon: Users },
];

const quarterlyEvents = [
  { quarter: "Q1", month: "March", event: "Physical Networking Hangout", icon: Users },
  { quarter: "Q2", month: "June", event: "Virtual Growth Summit", icon: Video },
  { quarter: "Q3", month: "September", event: "CEO Wellness Wave", icon: Dumbbell },
  { quarter: "Q4", month: "December", event: "Year-End Celebration & Awards", icon: Trophy },
];

const EventsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="events" className="section-padding bg-gradient-section" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-[#E7F2EB] text-[#117E39] font-medium text-sm mb-4">
            Annual Calendar
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Events & Programs
          </h2>
          <p className="text-lg text-muted-foreground">
            Stay connected with our regular events designed to educate, inspire, and connect entrepreneurs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Monthly Events */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">Monthly Events</h3>
            </div>

            <div className="space-y-4">
              {monthlyEvents.map((event, index) => (
                <motion.div
                  key={event.event}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="p-4 bg-background rounded-2xl border border-border hover:border-primary/50 transition-colors flex items-center gap-4"
                >
                  <div className="w-10 h-10  bg-[#E7F2EB] rounded-xl flex items-center justify-center shrink-0">
                    <event.icon className="w-5 h-5 text-[#117E39]" />
                  </div>
                  <div className="grow">
                    <p className="font-display font-bold text-foreground">{event.event}</p>
                    <p className="text-sm text-muted-foreground">{event.day}</p>
                  </div>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground text-xs font-medium rounded-full">
                    {event.week}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Office Hours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-foreground">WhatsApp Office Hours</p>
                <p className="text-sm text-muted-foreground">Every Friday, 9am - 8pm</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Quarterly Events */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">Quarterly Events</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {quarterlyEvents.map((event, index) => (
                <motion.div
                  key={event.quarter}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="p-6 bg-background rounded-2xl border border-border hover:shadow-soft transition-all text-center"
                >
                  <div className="w-12 h-12 bg-[#E7F2EB] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <event.icon className="w-6 h-6  text-[#117E39] " />
                  </div>
                  <span className="inline-block px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full mb-2">
                    {event.quarter} • {event.month}
                  </span>
                  <p className="font-display font-bold text-foreground text-sm">{event.event}</p>
                </motion.div>
              ))}
            </div>

            {/* Special Campaigns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-6 p-6 bg-charcoal rounded-2xl text-white"
            >
              <h4 className="font-display text-lg font-bold mb-4">Special Campaigns</h4>
              <ul className="space-y-2 text-sm text-white">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  30-Day FinWell Challenge (twice yearly)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Tax Season Bootcamp (January-March)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Referral Drives (ongoing)
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;

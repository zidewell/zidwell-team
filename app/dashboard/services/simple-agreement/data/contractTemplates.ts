
export interface ContractTemplateType {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  price: number;
}

export const contractTemplates: ContractTemplateType[] = [

  {
    id: "service-agreement",
    title: "Service Agreement",
    description: "Standard service provider agreement",
    category: "Business",
    icon: "📝",
    price: 1000,
  },
  {
    id: "employment-contract",
    title: "Employment Contract", 
    description: "Formal employment agreement",
    category: "Employment",
    icon: "💼",
    price: 1000,
  },
  {
    id: "nda-template",
    title: "Non-Disclosure Agreement",
    description: "Confidentiality and NDA agreement",
    category: "Legal",
    icon: "🔒",
    price: 1000,
  },
  {
    id: "partnership-agreement",
    title: "Partnership Agreement",
    description: "Formal business partnership contract",
    category: "Business",
    icon: "🤝",
    price: 1000,
  },
  {
    id: "consulting-agreement",
    title: "Consulting Agreement", 
    description: "Professional consulting services contract",
    category: "Business",
    icon: "💡",
    price: 1000,
  },
  {
    id: "freelance-contract",
    title: "Freelance Contract",
    description: "Independent contractor agreement",
    category: "Business",
    icon: "🖥️",
    price: 1000,
  },
  {
    id: "vendor-agreement",
    title: "Vendor Agreement",
    description: "Supplier and vendor services contract",
    category: "Business",
    icon: "🚚",
    price: 1000,
  },

  // Real Estate
  {
    id: "lease-agreement",
    title: "Lease Agreement",
    description: "Residential or commercial property lease",
    category: "Real Estate", 
    icon: "🏠",
    price: 1000,
  },
  {
    id: "property-sale",
    title: "Property Sale Agreement",
    description: "Real estate purchase and sale contract",
    category: "Real Estate",
    icon: "🏢",
    price: 1000,
  },
  {
    id: "room-rental",
    title: "Room Rental Agreement",
    description: "Room rental and shared space contract",
    category: "Real Estate",
    icon: "🚪",
    price: 1000,
  },

  // Technology & Digital
  {
    id: "software-license",
    title: "Software License Agreement",
    description: "Software usage and licensing terms",
    category: "Technology",
    icon: "💻",
    price: 1000,
  },
  {
    id: "website-development",
    title: "Website Development Contract",
    description: "Web design and development agreement", 
    category: "Technology",
    icon: "🌐",
    price: 1000,
  },
  {
    id: "app-development",
    title: "App Development Agreement",
    description: "Mobile application development contract",
    category: "Technology",
    icon: "📱",
    price: 1000,
  },
  {
    id: "saas-agreement",
    title: "SaaS Agreement",
    description: "Software as a Service subscription contract",
    category: "Technology",
    icon: "☁️",
    price: 1000,
  },

  // Creative & Media
  {
    id: "photography-contract",
    title: "Photography Agreement",
    description: "Professional photography services contract",
    category: "Creative",
    icon: "📸",
    price: 1000,
  },
  {
    id: "content-creation",
    title: "Content Creation Agreement", 
    description: "Content writing and creation services",
    category: "Creative",
    icon: "✍️",
    price: 1000,
  },
  {
    id: "influencer-agreement",
    title: "Influencer Agreement",
    description: "Social media influencer collaboration contract",
    category: "Creative",
    icon: "📢",
    price: 1000,
  },
  {
    id: "video-production",
    title: "Video Production Agreement",
    description: "Video filming and production services",
    category: "Creative",
    icon: "🎬",
    price: 1000,
  },

  // Personal & Events
  {
    id: "event-planning",
    title: "Event Planning Contract",
    description: "Event management and planning services",
    category: "Events", 
    icon: "🎉",
    price: 1000,
  },
  {
    id: "wedding-contract",
    title: "Wedding Services Agreement",
    description: "Wedding planning and services contract",
    category: "Events",
    icon: "💒",
    price: 1000,
  },
  {
    id: "catering-agreement",
    title: "Catering Agreement",
    description: "Food and beverage catering services",
    category: "Events",
    icon: "🍽️",
    price: 1000,
  },

  // Financial & Loans
  {
    id: "loan-agreement",
    title: "Loan Agreement",
    description: "Formal loan and repayment contract",
    category: "Financial",
    icon: "💰",
    price: 1000,
  },
  {
    id: "payment-plan",
    title: "Payment Plan Agreement",
    description: "Installment payment arrangement contract",
    category: "Financial",
    icon: "💳",
    price: 1000,
  },
  {
    id: "investment-agreement",
    title: "Investment Agreement",
    description: "Business investment and equity contract",
    category: "Financial",
    icon: "📈",
    price: 1000,
  },

  // Education & Training
  {
    id: "tutoring-agreement",
    title: "Tutoring Agreement",
    description: "Educational tutoring services contract",
    category: "Education",
    icon: "🎓",
    price: 1000,
  },
  {
    id: "training-contract",
    title: "Training Services Agreement",
    description: "Professional training and workshop contract",
    category: "Education",
    icon: "📚",
    price: 1000,
  },
  {
    id: "course-creation",
    title: "Course Creation Agreement",
    description: "Online course development contract",
    category: "Education",
    icon: "🎥",
    price: 1000,
  },

  // Healthcare & Wellness
  {
    id: "medical-consent",
    title: "Medical Consent Form",
    description: "Healthcare treatment consent agreement",
    category: "Healthcare",
    icon: "🏥",
    price: 1000,
  },
  {
    id: "therapy-agreement",
    title: "Therapy Services Agreement",
    description: "Counseling and therapy services contract",
    category: "Healthcare",
    icon: "🧠",
    price: 1000,
  },
  {
    id: "fitness-training",
    title: "Fitness Training Agreement",
    description: "Personal training and fitness services",
    category: "Healthcare",
    icon: "💪",
    price: 1000,
  },

  // Legal & Compliance
  {
    id: "privacy-policy",
    title: "Privacy Policy Template",
    description: "Website and app privacy policy",
    category: "Legal",
    icon: "🛡️",
    price: 1000,
  },
  {
    id: "terms-service",
    title: "Terms of Service",
    description: "Website terms and conditions",
    category: "Legal",
    icon: "📄",
    price: 1000,
  }
];
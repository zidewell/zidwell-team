import { BlogPost, Category, Archive, Author } from "@/app/components/blog-components/blog/types/blog"; 

export const categories: Category[] = [
  { id: "1", name: "Personal Finance", slug: "personal-finance", postCount: 12 },
  { id: "2", name: "Investing", slug: "investing", postCount: 8 },
  { id: "3", name: "Wealth Management", slug: "wealth-management", postCount: 6 },
  { id: "4", name: "Market Analysis", slug: "market-analysis", postCount: 10 },
  { id: "5", name: "Financial Planning", slug: "financial-planning", postCount: 5 },
  { id: "6", name: "Crypto & Digital Assets", slug: "crypto-digital-assets", postCount: 4 },
];

export const archives: Archive[] = [
  { month: "January", year: 2025, count: 5, label: "January 2025" },
  { month: "December", year: 2024, count: 4, label: "December 2024" },
  { month: "November", year: 2024, count: 6, label: "November 2024" },
  { month: "October", year: 2024, count: 3, label: "October 2024" },
  { month: "September", year: 2024, count: 7, label: "September 2024" },
];

const authors: Author[] = [
  { id: "1", name: "Sarah Mitchell", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", isZidwellUser: true },
  { id: "2", name: "James Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", isZidwellUser: true },
  { id: "3", name: "Emily Rodriguez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", isZidwellUser: false },
];

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Understanding Market Volatility: A Guide for Long-Term Investors",
    slug: "understanding-market-volatility",
    excerpt: "Market volatility can be unsettling, but understanding its nature can help you make better investment decisions and stay the course during turbulent times.",
    content: `<p>Market volatility is often viewed with trepidation by investors, particularly those who are new to investing or those who have experienced significant losses during market downturns. However, understanding the nature of volatility can help you navigate these turbulent periods with greater confidence and potentially even capitalize on the opportunities they present.</p>

<h2>What Causes Market Volatility?</h2>

<p>Volatility in financial markets can stem from various sources, including economic data releases, geopolitical events, changes in monetary policy, and shifts in investor sentiment. During periods of uncertainty, markets tend to experience larger price swings as investors reassess their expectations and adjust their portfolios accordingly.</p>

<p>It's important to recognize that volatility is a natural part of investing. Markets don't move in straight lines, and the same forces that create downward pressure can also fuel significant rallies. Historical data shows that some of the best trading days often occur during or shortly after periods of high volatility.</p>

<h2>Strategies for Managing Volatility</h2>

<p>One of the most effective ways to manage volatility is through diversification. By spreading your investments across different asset classes, sectors, and geographic regions, you can reduce the impact of any single investment's performance on your overall portfolio.</p>

<blockquote>The stock market is a device for transferring money from the impatient to the patient. — Warren Buffett</blockquote>

<p>Dollar-cost averaging is another powerful tool for managing volatility. By investing a fixed amount at regular intervals, you automatically buy more shares when prices are low and fewer when prices are high, potentially lowering your average cost per share over time.</p>

<h3>Maintaining Perspective</h3>

<p>Perhaps the most important strategy for dealing with volatility is maintaining a long-term perspective. While short-term market movements can be dramatic, history has shown that markets tend to rise over longer periods. Investors who stay invested through market cycles have generally been rewarded for their patience.</p>

<p>Consider keeping a portion of your portfolio in more stable investments like bonds or cash equivalents. This can provide both psychological comfort during volatile periods and the liquidity needed to take advantage of buying opportunities when they arise.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop",
    author: authors[0],
    categories: [categories[1], categories[3]],
    tags: ["investing", "volatility", "long-term"],
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    readTime: 8,
    isPublished: true,
    comments: [
      { id: "c1", content: "Great insights! This helped me understand why I shouldn't panic during market dips.", author: { id: "u1", name: "Michael Torres", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", isZidwellUser: true }, createdAt: "2025-01-16T14:30:00Z", isApproved: true },
      { id: "c2", content: "I wish I had read this before selling during the last correction. Lesson learned!", author: { id: "u2", name: "Lisa Wang", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", isZidwellUser: false }, createdAt: "2025-01-17T09:15:00Z", isApproved: true },
    ],
  },
  {
    id: "2",
    title: "Building an Emergency Fund: Your Financial Safety Net",
    slug: "building-emergency-fund",
    excerpt: "An emergency fund is the foundation of financial security. Learn how much you need and the best strategies for building one.",
    content: `<p>An emergency fund is one of the most important components of a solid financial plan. It provides a buffer against life's unexpected expenses and can prevent you from going into debt when faced with financial emergencies.</p>

<h2>Why You Need an Emergency Fund</h2>

<p>Life is unpredictable. Job losses, medical emergencies, car repairs, and home maintenance issues can all create significant financial stress if you're not prepared. Without an emergency fund, you might be forced to rely on credit cards, personal loans, or even retirement savings to cover unexpected expenses.</p>

<p>Having three to six months of living expenses saved in an easily accessible account can provide peace of mind and financial stability during uncertain times.</p>

<h2>How to Build Your Emergency Fund</h2>

<p>Start by calculating your essential monthly expenses, including housing, utilities, food, transportation, and insurance. Multiply this by three to six months to determine your target amount.</p>

<p>Then, set up automatic transfers from your checking account to a dedicated savings account. Even small, consistent contributions can add up over time. Consider opening a high-yield savings account to earn more interest on your emergency fund while keeping it easily accessible.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=450&fit=crop",
    author: authors[1],
    categories: [categories[0], categories[4]],
    tags: ["savings", "emergency-fund", "planning"],
    createdAt: "2025-01-12T09:00:00Z",
    updatedAt: "2025-01-12T09:00:00Z",
    readTime: 6,
    isPublished: true,
    comments: [],
  },
  {
    id: "3",
    title: "The Rise of ESG Investing: Aligning Values with Returns",
    slug: "rise-of-esg-investing",
    excerpt: "Environmental, Social, and Governance investing is reshaping how investors think about returns and responsibility.",
    content: `<p>ESG investing has emerged as one of the most significant trends in the investment world. This approach considers environmental, social, and governance factors alongside traditional financial metrics when making investment decisions.</p>

<h2>Understanding ESG Criteria</h2>

<p>Environmental factors include a company's impact on climate change, resource depletion, waste, and pollution. Social criteria examine how a company manages relationships with employees, suppliers, customers, and communities. Governance deals with company leadership, executive pay, audits, and shareholder rights.</p>

<p>Research increasingly suggests that companies with strong ESG practices may be better positioned for long-term success, potentially offering both competitive returns and positive societal impact.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1518173946687-a4c036bc8ba2?w=800&h=450&fit=crop",
    author: authors[2],
    categories: [categories[1], categories[2]],
    tags: ["esg", "sustainable-investing", "responsibility"],
    createdAt: "2025-01-10T11:00:00Z",
    updatedAt: "2025-01-10T11:00:00Z",
    readTime: 7,
    isPublished: true,
    comments: [],
  },
  {
    id: "4",
    title: "Cryptocurrency in 2025: What Every Investor Should Know",
    slug: "cryptocurrency-2025-guide",
    excerpt: "As digital assets mature, understanding their role in a diversified portfolio becomes increasingly important.",
    content: `<p>The cryptocurrency landscape has evolved dramatically since Bitcoin's inception. Today, digital assets represent a diverse and maturing asset class that continues to attract institutional and retail investors alike.</p>

<h2>The State of Crypto in 2025</h2>

<p>Regulatory clarity has improved significantly, with major economies implementing frameworks for digital asset trading and custody. This has opened the door for more traditional financial institutions to offer crypto-related products and services.</p>

<p>However, volatility remains a defining characteristic of the asset class. Investors considering cryptocurrency exposure should carefully assess their risk tolerance and investment timeline before allocating capital to this space.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=450&fit=crop",
    author: authors[0],
    categories: [categories[5], categories[1]],
    tags: ["cryptocurrency", "bitcoin", "digital-assets"],
    createdAt: "2025-01-08T14:00:00Z",
    updatedAt: "2025-01-08T14:00:00Z",
    readTime: 5,
    isPublished: true,
    comments: [],
  },
  {
    id: "5",
    title: "Retirement Planning in Your 30s: Setting the Foundation",
    slug: "retirement-planning-30s",
    excerpt: "Your 30s are a crucial decade for retirement planning. Here's how to maximize this pivotal time.",
    content: `<p>While retirement might seem distant in your 30s, the decisions you make during this decade can have an outsized impact on your financial future. The power of compound interest means that money invested now has decades to grow.</p>

<h2>Maximizing Your Contributions</h2>

<p>Take full advantage of employer-sponsored retirement plans, especially if your employer offers matching contributions. This is essentially free money that can significantly accelerate your wealth building.</p>

<p>Consider opening and maximizing contributions to a Roth IRA if you're eligible. The tax-free growth and withdrawals in retirement can be incredibly valuable, particularly if you expect to be in a higher tax bracket later in life.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=450&fit=crop",
    author: authors[1],
    categories: [categories[4], categories[0]],
    tags: ["retirement", "planning", "investing"],
    createdAt: "2025-01-05T08:00:00Z",
    updatedAt: "2025-01-05T08:00:00Z",
    readTime: 6,
    isPublished: true,
    comments: [],
  },
  {
    id: "6",
    title: "Understanding Interest Rates: Impact on Your Financial Decisions",
    slug: "understanding-interest-rates",
    excerpt: "Interest rates affect everything from mortgages to savings accounts. Learn how to make informed decisions in any rate environment.",
    content: `<p>Interest rates are one of the most important factors in personal finance, influencing borrowing costs, investment returns, and the overall economy. Understanding how rates work can help you make better financial decisions.</p>

<h2>How Central Banks Influence Rates</h2>

<p>Central banks use interest rate policy as a primary tool for managing economic growth and inflation. When rates are low, borrowing becomes cheaper, encouraging spending and investment. Higher rates tend to slow economic activity and control inflation.</p>`,
    featuredImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop",
    author: authors[2],
    categories: [categories[3], categories[0]],
    tags: ["interest-rates", "economy", "borrowing"],
    createdAt: "2025-01-03T10:00:00Z",
    updatedAt: "2025-01-03T10:00:00Z",
    readTime: 5,
    isPublished: true,
    comments: [],
  },
];

export const recentPosts = blogPosts.slice(0, 4);

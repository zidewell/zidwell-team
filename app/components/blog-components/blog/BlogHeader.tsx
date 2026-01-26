import Link from "next/link";


const BlogHeader = () => {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">Zidwell</span>
            <span className="text-accent font-medium">Blog</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              All Articles
            </Link>
            <Link href="/?category=investing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Investing
            </Link>
            <Link href="/?category=personal-finance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Personal Finance
            </Link>
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Write
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BlogHeader;

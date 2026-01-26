"use client "
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "../../ui/input"; 
import { Button } from "../../ui/button"; 
import { categories, archives, recentPosts } from "@/app/blog/data/mockData";
import Link from "next/link";

interface BlogSidebarProps {
  onSearch?: (query: string) => void;
}

const BlogSidebar = ({ onSearch }: BlogSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription
    alert("Thank you for subscribing!");
    setEmail("");
  };

  return (
    <aside className="space-y-8">
      {/* Search */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Search
        </h3>
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Subscribe */}
      <div className="bg-secondary/50 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Get Updates
        </h3>
        <p className="text-sm text-muted-foreground">
          Subscribe to receive the latest financial insights directly in your inbox.
        </p>
        <form onSubmit={handleSubscribe} className="space-y-2">
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Subscribe
          </Button>
        </form>
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Posts
        </h3>
        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="flex gap-3 group"
            >
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-16 h-16 object-cover rounded flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.readTime} min read
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/?category=${category.slug}`}
                className="flex items-center justify-between text-sm hover:text-accent transition-colors"
              >
                <span>{category.name}</span>
                <span className="text-muted-foreground">({category.postCount})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Archives */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Archives
        </h3>
        <ul className="space-y-2">
          {archives.map((archive) => (
            <li key={archive.label}>
              <Link
                href={`/?archive=${archive.year}-${archive.month.toLowerCase()}`}
                className="flex items-center justify-between text-sm hover:text-accent transition-colors"
              >
                <span>{archive.label}</span>
                <span className="text-muted-foreground">({archive.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Ad Placeholder */}
      <div className="bg-muted rounded-lg p-6 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Advertisement
        </p>
        <div className="h-48 bg-border/50 rounded flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Ad Space</span>
        </div>
      </div>
    </aside>
  );
};

export default BlogSidebar;

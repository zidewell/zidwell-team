"use client"
import { useState, useEffect, useCallback } from "react";
import BlogHeader from "../components/blog-components/blog/BlogHeader"; 
import BlogSidebar from "../components/blog-components/blog/BlogSideBar"; 
import BlogCard from "../components/blog-components/blog/BlogCard"; 
import AdPlaceholder from "../components/blog-components/blog/Adpaceholder"; 
import { blogPosts } from "./data/mockData"; 
import { BlogPost } from "../components/blog-components/blog/types/blog"; 

const POSTS_PER_PAGE = 4;

const BlogPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const start = (page - 1) * POSTS_PER_PAGE;
      const end = start + POSTS_PER_PAGE;
      const filteredPosts = searchQuery
        ? blogPosts.filter(
            (p) =>
              p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : blogPosts;
      
      const newPosts = filteredPosts.slice(start, end);
      
      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => (page === 1 ? newPosts : [...prev, ...newPosts]));
        setPage((prev) => prev + 1);
        setHasMore(end < filteredPosts.length);
      }
      setLoading(false);
    }, 500);
  }, [page, loading, hasMore, searchQuery]);

  useEffect(() => {
    loadMorePosts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMorePosts]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    setPosts([]);
    setHasMore(true);
    
    // Trigger reload
    setTimeout(() => {
      const filteredPosts = query
        ? blogPosts.filter(
            (p) =>
              p.title.toLowerCase().includes(query.toLowerCase()) ||
              p.excerpt.toLowerCase().includes(query.toLowerCase())
          )
        : blogPosts;
      setPosts(filteredPosts.slice(0, POSTS_PER_PAGE));
      setPage(2);
      setHasMore(POSTS_PER_PAGE < filteredPosts.length);
    }, 100);
  };

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          {/* Main Content */}
          <div>
            {/* Featured Post */}
            {featuredPost && (
              <div className="mb-12">
                <BlogCard post={featuredPost} variant="featured" />
              </div>
            )}

            {/* Ad after featured */}
            <AdPlaceholder variant="horizontal" />

            {/* Post Grid */}
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              {regularPosts.map((post, index) => (
                <div key={post.id}>
                  <BlogCard post={post} />
                  {/* Insert ad every 4 posts */}
                  {(index + 1) % 4 === 0 && (
                    <div className="mt-8">
                      <AdPlaceholder variant="inline" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* No more posts */}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-muted-foreground py-8">
                You've reached the end
              </p>
            )}

            {/* No results */}
            {!loading && posts.length === 0 && searchQuery && (
              <p className="text-center text-muted-foreground py-16">
                No articles found for "{searchQuery}"
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <BlogSidebar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogPage;

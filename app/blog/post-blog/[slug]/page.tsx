"use client"
import { BlogPost } from "@/app/components/blog-components/blog/types/blog";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { blogPosts } from "../../data/mockData";
import BlogHeader from "@/app/components/blog-components/blog/BlogHeader";
import { Badge } from "@/app/components/ui/badge";
import AudioPlayer from "@/app/components/blog-components/blog/AudioPlayer";
import ArticleContent from "@/app/components/blog-components/blog/AticleContent";
import CommentSection from "@/app/components/blog-components/blog/CommentSection";
import BlogCard from "@/app/components/blog-components/blog/BlogCard";
import BlogSidebar from "@/app/components/blog-components/blog/BlogSideBar";
import InlineSubscribe from "@/app/components/blog-components/blog/InlineSubscribe";
import AdPlaceholder from "@/app/components/blog-components/blog/Adpaceholder";
import { format } from "date-fns"; // Import format function

const PostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [previousPosts, setPreviousPosts] = useState<BlogPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    const foundPost = blogPosts.find((p) => p.slug === slug);
    setPost(foundPost || null);

    if (foundPost) {
      // Get related posts (same category, excluding current)
      const related = blogPosts
        .filter(
          (p) =>
            p.id !== foundPost.id &&
            p.categories.some((c) =>
              foundPost.categories.some((fc) => fc.id === c.id)
            )
        )
        .slice(0, 4);
      setRelatedPosts(related);

      // Get previous posts for infinite scroll
      const previous = blogPosts
        .filter((p) => p.id !== foundPost.id)
        .slice(0, 4);
      setPreviousPosts(previous);
      setHasMore(blogPosts.length > 4); // Check if there are more posts
    }
  }, [slug]);

  const loadMorePosts = useCallback(() => {
    if (loadingMore || !hasMore || !post) return;

    setLoadingMore(true);
    setTimeout(() => {
      const currentLength = previousPosts.length;
      const morePosts = blogPosts
        .filter((p) => p.id !== post.id)
        .slice(currentLength, currentLength + 4);

      if (morePosts.length === 0) {
        setHasMore(false);
      } else {
        setPreviousPosts((prev) => [...prev, ...morePosts]);
      }
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, hasMore, previousPosts.length, post]);

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

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "/images/placeholder.jpg";
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <BlogHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Article not found</h1>
          <p className="text-muted-foreground mt-2">
            The article you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Split content for inline subscribe insertion
  const contentParts = post.content.split("</p>");
  const midPoint = Math.max(1, Math.floor(contentParts.length / 2));
  const firstHalf = contentParts.slice(0, midPoint).join("</p>") + "</p>";
  const secondHalf = contentParts.slice(midPoint).join("</p>") || post.content;

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="max-w-4xl mx-auto lg:mx-0">
            <article>
              {/* Article Header */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {post.categories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant="secondary"
                      className="text-accent uppercase text-xs tracking-wider"
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-6">
                  {post.title}
                </h1>

                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={post.author.avatar || "/images/avatar-placeholder.jpg"}
                    alt={post.author.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{post.author.name}</span>
                      {post.author.isZidwellUser && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-accent/10 text-accent"
                        >
                          Zidwell User
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(post.createdAt), "MMMM d, yyyy")} ·{" "}
                      {post.readTime} min read
                    </p>
                  </div>
                </div>

                {/* Audio Player */}
                <AudioPlayer content={post.content} />
              </header>

              {/* Featured Image */}
              <div className="aspect-video overflow-hidden rounded-lg mb-8">
                <img
                  src={post.featuredImage || "/images/placeholder.jpg"}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>

              {/* Article Content - First Half */}
              <ArticleContent content={firstHalf} />

              {/* Inline Subscribe */}
              <InlineSubscribe />

              {/* Ad Placement */}
              <AdPlaceholder variant="inline" />

              {/* Article Content - Second Half */}
              <ArticleContent content={secondHalf} />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-border">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </article>

            {/* Comments */}
            <CommentSection comments={post.comments} postId={post.id} />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section className="mt-16 pt-8 border-t border-border">
                <h3 className="text-xl font-semibold mb-8">
                  Related Articles
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  {relatedPosts.map((relatedPost) => (
                    <BlogCard key={relatedPost.id} post={relatedPost} />
                  ))}
                </div>
              </section>
            )}

            {/* Previous Posts - Infinite Scroll */}
            {previousPosts.length > 0 && (
              <section className="mt-16 pt-8 border-t border-border">
                <h3 className="text-xl font-semibold mb-8">
                  More from Zidwell Blog
                </h3>

                <div className="grid md:grid-cols-2 gap-8">
                  {previousPosts.map((prevPost) => (
                    <BlogCard key={prevPost.id} post={prevPost} />
                  ))}
                </div>

                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!hasMore && previousPosts.length > 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    You&apos;ve reached the end
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <BlogSidebar />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostPage;
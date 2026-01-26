import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Eye, TrendingUp } from "lucide-react";
import { blogPosts } from "@/data/mockBlogData";

const stats = [
  {
    title: "Total Posts",
    value: blogPosts.length.toString(),
    icon: FileText,
    change: "+2 this week",
  },
  {
    title: "Total Comments",
    value: blogPosts.reduce((acc, post) => acc + post.comments.length, 0).toString(),
    icon: MessageSquare,
    change: "+5 this week",
  },
  {
    title: "Page Views",
    value: "12.4K",
    icon: Eye,
    change: "+12% vs last week",
  },
  {
    title: "Engagement Rate",
    value: "4.2%",
    icon: TrendingUp,
    change: "+0.5% vs last week",
  },
];

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Zidwell Blog content management system.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {blogPosts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div>
                      <h4 className="font-medium line-clamp-1">{post.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {post.author.name} · {post.readTime} min read
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      post.isPublished
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {post.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

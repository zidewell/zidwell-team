export interface Author {
  id: string;
  name: string;
  avatar: string;
  isZidwellUser: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isApproved: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  author: Author;
  categories: Category[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  readTime: number;
  audioUrl?: string;
  isPublished: boolean;
  comments: Comment[];
}

export interface Archive {
  month: string;
  year: number;
  count: number;
  label: string;
}

import BlogHeader from '@/components/BlogHeader';
import SiteFooter from '@/components/SiteFooter';
import ViewCounter from '@/components/ViewCounter';
import { getPostBySlug, mdToHtml, formatDate } from '@/lib/posts';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: 'Không tìm thấy bài viết — Hướng về Hoà Lạc' };
  const url = `https://www.huongvehoalac.com/blog/${post.slug}`;
  const images = post.cover_image ? [post.cover_image] : [];
  return {
    title: `${post.title} — Hướng về Hoà Lạc`,
    description: post.excerpt || post.title,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || '',
      url,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || '',
      images,
    },
  };
}

export default async function PostPage({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const html = mdToHtml(post.content);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image ? [post.cover_image] : undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: { '@type': 'Person', name: 'Đỗ Mạnh Hướng', url: 'https://www.huongvehoalac.com/' },
    publisher: { '@type': 'Organization', name: 'Hướng về Hoà Lạc' },
    mainEntityOfPage: `https://www.huongvehoalac.com/blog/${post.slug}`,
  };

  return (
    <div className="rent-page">
      <BlogHeader />
      <article className="post-wrap">
        <a className="post-back" href="/blog">
          ← Về Blog
        </a>
        {post.tags && post.tags.length > 0 && <div className="post-tags">{post.tags.join(' · ')}</div>}
        <h1 className="post-title">{post.title}</h1>
        <div className="post-date">
          {formatDate(post.published_at || post.created_at)} · {(post.views ?? 0).toLocaleString('vi-VN')} lượt xem
        </div>
        <ViewCounter slug={post.slug} />
        {post.cover_image && <img className="post-cover" src={post.cover_image} alt={post.title} />}
        <div className="post-content" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="post-cta">
          <a className="blog-btn" href="/bang-hang">
            Xem bảng hàng dự án →
          </a>
        </div>
      </article>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}

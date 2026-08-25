import BlogHeader from '@/components/BlogHeader';
import FloatingAd from '@/components/FloatingAd';
import SiteFooter from '@/components/SiteFooter';
import { getPublishedPosts, formatDate } from '@/lib/posts';

export const revalidate = 60;

export const metadata = {
  title: 'Blog — Hướng về Hoà Lạc',
  description:
    'Chia sẻ kiến thức & tin tức bất động sản khu vực Hòa Lạc: Xanh Villas, Metro City và thị trường phía Tây Hà Nội.',
  alternates: { canonical: 'https://www.huongvehoalac.com/blog' },
  openGraph: {
    type: 'website',
    title: 'Blog — Hướng về Hoà Lạc',
    description: 'Kiến thức & tin tức bất động sản khu vực Hòa Lạc.',
    url: 'https://www.huongvehoalac.com/blog',
  },
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  return (
    <div className="rent-page">
      <BlogHeader active="blog" />
      <main className="rent-main">
        <div className="rent-head">
          <div>
            <p className="rent-eyebrow">Blog</p>
            <h2>Kiến thức &amp; tin tức BĐS Hòa Lạc</h2>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="rent-empty">Chưa có bài viết. Nội dung sẽ được cập nhật sớm.</p>
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <a className="blog-card" href={`/blog/${p.slug}`} key={p.id}>
                <div className="blog-thumb">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt={p.title} />
                  ) : (
                    <div className="rent-ph">Bài viết</div>
                  )}
                </div>
                <div className="blog-body">
                  {p.tags && p.tags.length > 0 && (
                    <div className="blog-tags">{p.tags.slice(0, 2).join(' · ')}</div>
                  )}
                  <h3>{p.title}</h3>
                  {p.excerpt && <p className="blog-excerpt">{p.excerpt}</p>}
                  <div className="blog-date">{formatDate(p.published_at)}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <FloatingAd />
    </div>
  );
}

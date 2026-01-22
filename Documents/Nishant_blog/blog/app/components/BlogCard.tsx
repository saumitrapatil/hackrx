import Link from 'next/link';

interface BlogCardProps {
    id: string;
    title: string;
    excerpt: string;
    tags: string[];
    readTime: string;
}

export default function BlogCard({ id, title, excerpt, tags, readTime }: BlogCardProps) {
    return (
        <Link href={`/blog/${id}`} style={{ textDecoration: 'none' }}>
            <article className="blog-card">
                <div style={{ marginBottom: '1rem' }}>
                    {tags.map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
                <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '0.75rem',
                    color: '#f4f4f5',
                    lineHeight: 1.3
                }}>
                    {title}
                </h3>
                <p style={{
                    color: '#a1a1aa',
                    fontSize: '0.95rem',
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {excerpt}
                </p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto'
                }}>
                    <span style={{ color: '#6366f1', fontSize: '0.9rem', fontWeight: 500 }}>
                        Read more →
                    </span>
                    <span style={{ color: '#71717a', fontSize: '0.85rem' }}>
                        {readTime}
                    </span>
                </div>
            </article>
        </Link>
    );
}

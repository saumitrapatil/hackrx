import BlogCard from './components/BlogCard';
import Link from 'next/link';

const blogs = [
  {
    id: 'attention-mechanism-sample-complexity',
    title: 'Attention Mechanism Sample Complexity and Expressiveness',
    excerpt: 'Transformers have revolutionized machine learning. From a learning theory perspective, what is the sample complexity of attention-based models? What function classes can they efficiently represent?',
    tags: ['Machine Learning', 'Attention', 'Theory'],
    readTime: '25 min read'
  },
  {
    id: 'transaction-semantics-checkpointing',
    title: 'Transaction Semantics for Model Checkpointing in Distributed Training',
    excerpt: "It's 3 AM, and your distributed training job has been running for 72 hours across 512 GPUs. Then: hardware failure. Can we apply transaction theory to distributed training?",
    tags: ['Distributed Systems', 'ML Ops', 'Databases'],
    readTime: '28 min read'
  },
  {
    id: 'learned-index-structures',
    title: 'Learned Index Structures with Distributional Shift Robustness',
    excerpt: 'Traditional database index structures operate through carefully designed algorithms with provable worst-case guarantees. Can learned indexes maintain theoretical guarantees under distribution shift?',
    tags: ['Databases', 'Machine Learning', 'Systems'],
    readTime: '22 min read'
  },
  {
    id: 'asynchronous-gradient-aggregation',
    title: 'Asynchronous Gradient Aggregation with Theoretical Convergence Guarantees',
    excerpt: 'Modern deep learning requires distributed training across thousands of accelerators. Can we design asynchronous algorithms that provably converge while maintaining efficiency?',
    tags: ['Distributed ML', 'Optimization', 'Theory'],
    readTime: '26 min read'
  },
  {
    id: 'transaction-semantics-extended',
    title: 'Transaction Semantics for Model Checkpointing: Extended Analysis',
    excerpt: 'Building on the theoretical framework for distributed training checkpointing, we explore advanced topics including stochastic failure models and multi-objective optimization.',
    tags: ['Distributed Systems', 'Theory', 'ML Ops'],
    readTime: '30 min read'
  },
  {
    id: 'implicit-bias-optimization-landscape',
    title: 'Implicit Bias and Optimization Landscape of Self-Attention',
    excerpt: 'Deep learning presents a profound puzzle: why does gradient descent consistently find solutions with excellent test performance in the vast solution space?',
    tags: ['Deep Learning', 'Optimization', 'Theory'],
    readTime: '27 min read'
  },
  {
    id: 'long-context-attention',
    title: 'Long-Context Attention with Subquadratic Complexity and Provable Approximation',
    excerpt: 'Standard self-attention has O(n²) complexity. Can we design attention mechanisms with subquadratic complexity while providing theoretical guarantees on approximation quality?',
    tags: ['Transformers', 'Efficiency', 'Theory'],
    readTime: '24 min read'
  },
  {
    id: 'neural-tangent-kernel',
    title: 'Neural Tangent Kernel Beyond Lazy Training',
    excerpt: 'The NTK theory provides a remarkable lens for understanding neural networks. But what happens beyond the lazy regime? How do finite-width networks actually learn features?',
    tags: ['Deep Learning', 'Kernel Methods', 'Theory'],
    readTime: '25 min read'
  },
  {
    id: 'implicit-regularization',
    title: 'Implicit Regularization in Overparameterized Networks',
    excerpt: 'Modern deep learning presents a paradox: overparameterized networks achieve zero training error yet generalize remarkably well. What implicit regularization does gradient descent provide?',
    tags: ['Generalization', 'Optimization', 'Theory'],
    readTime: '28 min read'
  }
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Deep Dive into ML Theory</h1>
          <p className="subtitle">
            Exploring the mathematical foundations of machine learning, distributed systems,
            and computational complexity. Rigorous analysis meets practical insights.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="#blogs" className="btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Explore Blogs
            </Link>
            <a
              href="https://github.com/saumitrapatil"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section id="blogs" style={{ paddingBottom: '4rem' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: '#f4f4f5'
        }}>
          Latest Articles
        </h2>
        <p style={{
          textAlign: 'center',
          color: '#a1a1aa',
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          In-depth explorations of machine learning theory, from attention mechanisms to distributed training
        </p>
        <div className="blog-grid">
          {blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              id={blog.id}
              title={blog.title}
              excerpt={blog.excerpt}
              tags={blog.tags}
              readTime={blog.readTime}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #27272a',
        padding: '2rem',
        textAlign: 'center',
        color: '#71717a'
      }}>
        <p>© 2026 Nishant Shukla. All rights reserved.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Built with Next.js • Exploring the frontiers of ML theory
        </p>
      </footer>
    </div>
  );
}

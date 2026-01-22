import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-content">
        <Link href="/" className="nav-logo">
          Nishant Shukla
        </Link>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/#blogs">Blogs</Link>
        </div>
      </div>
    </nav>
  );
}


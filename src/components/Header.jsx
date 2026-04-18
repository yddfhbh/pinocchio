import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="header">
      <div className="container nav">
        <Link to="/" className="logo">
          pusanpino
        </Link>

        <nav className="menu">
          <Link to="/">홈</Link>
          <Link to="/about">소개</Link>
          <Link to="/contact">문의</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
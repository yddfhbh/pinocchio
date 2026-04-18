import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          PINOCCHIO
        </Link>

        <nav className="nav">
          <Link to="/">홈</Link>
          <Link to="/about">동아리 소개</Link>
          <Link to="/scores">악보실</Link>
          <Link to="/videos">공연 영상</Link>
          <Link to="/schedule">일정</Link>
          <Link to="/guestbook">방명록</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
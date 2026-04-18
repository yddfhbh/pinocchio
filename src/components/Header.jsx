import { Link } from "react-router-dom";
import { useState } from "react";

function Header({ isAdmin, isLoading, isSubmitting, onLogin, onLogout }) {
  const [adminCode, setAdminCode] = useState("");
  const [status, setStatus] = useState(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus(null);

    try {
      await onLogin(adminCode);
      setAdminCode("");
      setStatus({
        type: "success",
        text: "관리자 로그인 상태입니다.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "관리자 로그인에 실패했습니다.",
      });
    }
  };

  const handleLogout = async () => {
    setStatus(null);

    try {
      await onLogout();
      setStatus({
        type: "success",
        text: "관리자 로그아웃이 완료되었습니다.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "로그아웃에 실패했습니다.",
      });
    }
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          PINOCCHIO
        </Link>

        <div className="header-right">
          {isAdmin ? (
            <div className="header-admin">
              <span className="header-admin-badge">관리자</span>
              <button
                type="button"
                className="btn btn-light header-admin-button"
                onClick={handleLogout}
                disabled={isSubmitting}
              >
                {isSubmitting ? "처리 중..." : "로그아웃"}
              </button>
            </div>
          ) : (
            <form className="header-admin" onSubmit={handleLogin}>
              <input
                type="password"
                placeholder="관리자 코드"
                value={adminCode}
                onChange={(event) => {
                  setAdminCode(event.target.value);

                  if (status) {
                    setStatus(null);
                  }
                }}
                disabled={isLoading || isSubmitting}
              />
              <button
                type="submit"
                className="btn btn-dark header-admin-button"
                disabled={!adminCode.trim() || isLoading || isSubmitting}
              >
                {isLoading ? "확인 중..." : isSubmitting ? "로그인 중..." : "로그인"}
              </button>
            </form>
          )}

          <nav className="nav">
            <Link to="/">홈</Link>
            <Link to="/about">동아리 소개</Link>
            <Link to="/scores">악보실</Link>
            <Link to="/videos">공연 영상</Link>
            <Link to="/schedule">일정</Link>
            <Link to="/guestbook">방명록</Link>
          </nav>

          {status ? (
            <p className={`guestbook-status header-admin-status is-${status.type}`}>
              {status.text}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;

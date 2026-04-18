import { Link } from "react-router-dom";
import { useState } from "react";
import { PromptDialog } from "./Dialog";

function Header({ isAdmin, isLoading, isSubmitting, onLogin, onLogout }) {
  const [status, setStatus] = useState(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeError, setAdminCodeError] = useState("");

  const handleAdminAction = async () => {
    setStatus(null);

    if (isAdmin) {
      try {
        await onLogout();
        setStatus(null);
      } catch (error) {
        setStatus({
          type: "error",
          text: error instanceof Error ? error.message : "로그아웃에 실패했습니다.",
        });
      }

      return;
    }
    setAdminCode("");
    setAdminCodeError("");
    setIsLoginDialogOpen(true);
  };

  const handleLoginConfirm = async () => {
    if (!adminCode.trim()) {
      setAdminCodeError("관리자 코드를 입력해주세요.");
      return;
    }

    try {
      await onLogin(adminCode.trim());
      setIsLoginDialogOpen(false);
      setAdminCode("");
      setAdminCodeError("");
      setStatus(null);
    } catch (error) {
      setAdminCodeError(
        error instanceof Error ? error.message : "관리자 로그인에 실패했습니다."
      );
    }
  };

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
          <span className="nav-admin-group">
            <Link to="/guestbook">방명록</Link>
            <button
              type="button"
              className={`nav-admin-button${isAdmin ? " is-active" : ""}`}
              onClick={handleAdminAction}
              disabled={isLoading || isSubmitting}
            >
              {isLoading ? "확인 중" : isSubmitting ? "처리 중" : isAdmin ? "로그아웃" : "관리자"}
            </button>
          </span>
        </nav>
      </div>
      {status ? (
        <div className="container">
          <p className={`guestbook-status header-status is-${status.type}`}>{status.text}</p>
        </div>
      ) : null}
      <PromptDialog
        open={isLoginDialogOpen}
        title="관리자 로그인"
        message="관리자 코드를 입력하면 관리 모드로 전환됩니다."
        value={adminCode}
        placeholder="관리자 코드"
        errorText={adminCodeError}
        confirmLabel="로그인"
        isSubmitting={isSubmitting}
        onChange={(value) => {
          setAdminCode(value);
          if (adminCodeError) {
            setAdminCodeError("");
          }
        }}
        onConfirm={handleLoginConfirm}
        onClose={() => {
          if (!isSubmitting) {
            setIsLoginDialogOpen(false);
            setAdminCode("");
            setAdminCodeError("");
          }
        }}
      />
    </header>
  );
}

export default Header;

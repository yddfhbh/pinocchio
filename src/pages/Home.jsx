import { Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="badge">Welcome to PINOCCHIO</span>
          <h1>
            우리의 연주와 기록이
            <br />
            머무는 동아리 홈페이지
          </h1>
          <p className="hero-text">
            악보 보관, 공연 영상 모음, 동아리 일정 관리,
            그리고 익명 방명록까지 한곳에서 확인할 수 있습니다.
          </p>

          <div className="hero-buttons">
            <Link to="/about" className="btn btn-dark">
              동아리 소개 보기
            </Link>
            <Link to="/guestbook" className="btn btn-light">
              방명록 가기
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container card-grid">
          <div className="card">
            <h3>악보실</h3>
            <p>
              연습용 악보와 합주 자료를 체계적으로 정리하고
              보관할 수 있는 공간입니다.
            </p>
          </div>

          <div className="card">
            <h3>공연 영상</h3>
            <p>
              유튜브에 업로드된 공연 영상을 모아
              한눈에 볼 수 있도록 전시합니다.
            </p>
          </div>

          <div className="card">
            <h3>동아리 일정</h3>
            <p>
              연습, 공연, 회의 일정을 확인하고
              앞으로의 계획을 함께 공유합니다.
            </p>
          </div>

          <div className="card">
            <h3>익명 방명록</h3>
            <p>
              자유롭게 응원과 감상을 남길 수 있는
              익명 메시지 공간입니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
import { Link } from "react-router-dom";

function Home() {
  return (
    <>
      <section className="hero container">
        <p className="badge">Welcome to pusanpino</p>
        <h1>
          깔끔하고 신뢰감 있는 웹사이트를 위한
          <br />
          첫 시작 페이지
        </h1>
        <p className="hero-text">
          브랜드 소개, 서비스 안내, 문의 유도까지 한 번에 담는
          심플한 랜딩 페이지입니다.
        </p>

        <div className="hero-buttons">
          <Link to="/contact" className="btn btn-dark">
            문의하기
          </Link>
          <Link to="/about" className="btn btn-light">
            더 알아보기
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="container card-grid">
          <div className="card">
            <h2>브랜드 소개</h2>
            <p>핵심 메시지를 빠르게 전달할 수 있는 소개 섹션입니다.</p>
          </div>

          <div className="card">
            <h2>서비스 안내</h2>
            <p>제공하는 서비스와 작업 내용을 보기 좋게 정리합니다.</p>
          </div>

          <div className="card">
            <h2>문의 유도</h2>
            <p>방문자가 자연스럽게 상담이나 문의를 남길 수 있게 합니다.</p>
          </div>
        </div>
      </section>

      <section className="cta container">
        <div className="cta-box">
          <h2>필요한 기능은 이제부터 붙이면 됩니다</h2>
          <p>
            문의 폼 저장, 관리자 페이지, 로그인, 게시판, DB 연결까지
            이 기본 구조 위에 확장할 수 있습니다.
          </p>
          <Link to="/contact" className="btn btn-white">
            시작하기
          </Link>
        </div>
      </section>
    </>
  );
}

export default Home;
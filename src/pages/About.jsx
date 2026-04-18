function About() {
  return (
    <section className="page container">
      <h1>소개</h1>
      <p className="page-desc">
        pusanpino는 심플하고 직관적인 웹 경험을 목표로 하는 사이트입니다.
        복잡하지 않지만 필요한 정보는 명확하게 전달하는 구조를 지향합니다.
      </p>

      <div className="about-grid">
        <div className="card">
          <h2>우리가 하는 일</h2>
          <p>
            브랜드 소개 페이지, 문의 유도 페이지, 기본 웹사이트 구조 제작 등
            실제 운영 가능한 형태의 웹 화면을 구성합니다.
          </p>
        </div>

        <div className="card">
          <h2>지향하는 방향</h2>
          <p>
            빠른 로딩, 모바일 최적화, 단순한 구조, 확장 가능한 코드 기반을
            중요하게 생각합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

export default About;
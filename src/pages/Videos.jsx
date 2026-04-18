function Videos() {
  return (
    <section className="page-section">
      <div className="container">
        <h2>공연 영상</h2>
        <p className="page-description">
          유튜브에 업로드된 동아리 공연 영상을 모아보는 공간입니다.
        </p>

        <div className="card-grid">
          <div className="card">
            <h3>2025 봄 정기연주회</h3>
            <p>공연 영상 링크와 설명이 이곳에 들어갈 예정입니다.</p>
          </div>

          <div className="card">
            <h3>버스킹 공연</h3>
            <p>공연 날짜, 장소, 곡 목록 등을 함께 정리할 수 있습니다.</p>
          </div>

          <div className="card">
            <h3>연습 영상 모음</h3>
            <p>공개 가능한 연습 영상도 함께 전시할 수 있습니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Videos;
function Scores() {
  return (
    <section className="page-section">
      <div className="container">
        <h2>악보실</h2>
        <p className="page-description">
          연습용 악보와 공연 준비 자료를 모아두는 공간입니다.
        </p>

        <div className="card-list">
          <div className="list-card">
            <h3>악보 업로드 예정</h3>
            <p>추후 PDF 악보 업로드 및 분류 기능이 추가될 예정입니다.</p>
          </div>

          <div className="list-card">
            <h3>카테고리 예시</h3>
            <p>정기공연 / 합주용 / 개인연습 / 파트별 자료</p>
          </div>

          <div className="list-card">
            <h3>권한 설정 예정</h3>
            <p>동아리원 전용 자료실 형태로 확장할 수 있습니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Scores;
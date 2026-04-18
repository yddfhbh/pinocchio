function Guestbook() {
  return (
    <section className="page-section">
      <div className="container">
        <h2>익명 방명록</h2>
        <p className="page-description">
          공연을 본 감상이나 응원의 메시지를 자유롭게 남겨주세요.
        </p>

        <div className="guestbook-form">
          <textarea
            placeholder="응원 한마디를 남겨주세요."
            rows="5"
          ></textarea>
          <button className="btn btn-dark">등록하기</button>
        </div>

        <div className="guestbook-list">
          <div className="guestbook-item">
            <p>익명: 오늘 공연 정말 좋았어요!</p>
          </div>
          <div className="guestbook-item">
            <p>익명: 다음 연주회도 기대하겠습니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Guestbook;
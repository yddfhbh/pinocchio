function About() {
  return (
    <section className="page-section">
      <div className="container">
        <h2>동아리 소개</h2>
        <p className="page-description">
          PINOCCHIO는 음악과 연주를 사랑하는 사람들이 모여
          함께 연습하고 공연을 만들어가는 동아리입니다.
        </p>

        <div className="info-box">
          <h3>우리가 하는 활동</h3>
          <ul>
            <li>정기 연습 및 합주</li>
            <li>교내외 공연 준비</li>
            <li>악보 공유와 파트 연습</li>
            <li>신입 부원 모집 및 교류 활동</li>
          </ul>
        </div>

        <div className="info-box">
          <h3>홈페이지에서 할 수 있는 것</h3>
          <ul>
            <li>동아리 활동 소개 보기</li>
            <li>악보 자료 확인</li>
            <li>공연 영상 감상</li>
            <li>일정 확인</li>
            <li>익명 방명록 작성</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default About;
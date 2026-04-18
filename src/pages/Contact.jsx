function Contact() {
  return (
    <section className="page container">
      <h1>문의하기</h1>
      <p className="page-desc">
        아래 내용을 입력해 주세요. 지금은 UI만 만든 상태입니다.
      </p>

      <form className="contact-form">
        <div className="form-group">
          <label>이름</label>
          <input type="text" placeholder="홍길동" />
        </div>

        <div className="form-group">
          <label>연락처</label>
          <input type="text" placeholder="010-0000-0000" />
        </div>

        <div className="form-group">
          <label>문의 내용</label>
          <textarea rows="6" placeholder="문의하실 내용을 입력해 주세요." />
        </div>

        <button type="submit" className="btn btn-dark">
          문의 보내기
        </button>
      </form>
    </section>
  );
}

export default Contact;
import { Link } from "react-router-dom";
import useGuestbookEntries from "../hooks/useGuestbookEntries";
import useScheduleEntries from "../hooks/useScheduleEntries";
import { formatGuestbookDate, getGuestbookDisplayName } from "../lib/guestbook";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCategoryLabel,
} from "../lib/schedule";

function Home() {
  const { entries: guestbookEntries, error, isLoading } = useGuestbookEntries(3);
  const {
    entries: scheduleEntries,
    error: scheduleError,
    isLoading: isScheduleLoading,
  } = useScheduleEntries(3);

  return (
    <div>
      <section className="hero home-layout">
        <div className="container hero-grid">
          <div className="hero-left">
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

          <div className="hero-right">
            <div className="calendar-card">
              <div className="calendar-card-head">
                <h3>다가오는 일정</h3>
                <Link to="/schedule" className="calendar-card-link">
                  전체 보기
                </Link>
              </div>

              <div className="calendar-preview-list">
                {scheduleError ? (
                  <div className="calendar-empty">
                    서버 연결 전에는 예시 일정을 보여줍니다.
                  </div>
                ) : null}

                {isScheduleLoading ? (
                  <div className="calendar-empty">일정을 불러오는 중입니다.</div>
                ) : scheduleEntries.length ? (
                  scheduleEntries.map((entry) => (
                    <article className="calendar-preview-item" key={entry.id}>
                      <div className="calendar-preview-top">
                        <span className="schedule-category-badge">
                          {getCategoryLabel(entry.category)}
                        </span>
                        <span>{formatScheduleTime(entry.startTime, entry.endTime)}</span>
                      </div>
                      <h4>{entry.title}</h4>
                      <p>{formatScheduleDate(entry.eventDate)}</p>
                    </article>
                  ))
                ) : (
                  <div className="calendar-empty">등록된 일정이 아직 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="media-guestbook-section compact-section">
        <div className="container media-guestbook-grid">
          <div className="media-column">
            <div className="section-title-wrap">
              <h2>대표 공연 영상</h2>
              <p>메인 페이지에서 바로 볼 수 있는 대표 영상입니다.</p>
            </div>

            <div className="home-video-card small-video-card">
              <div className="video-frame small-video-frame">
                <iframe
                  src="https://www.youtube.com/embed/bZxeSLM4TWs"
                  title="Where is BLUE (김푸른 리사이틀) 1부"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="video-info">
                <h3>Where is BLUE (김푸른 리사이틀) 1부</h3>
                <p>
                  피노키오의 대표 공연 영상입니다.
                  메인 페이지에서 바로 공연 분위기를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="guestbook-column">
            <div className="section-title-wrap">
              <h2>방명록</h2>
              <p>짧은 응원과 한마디를 남길 수 있는 공간입니다.</p>
            </div>

            <div className="guestbook-preview-card guestbook-side-card">
              {error ? (
                <div className="guestbook-empty preview-empty">
                  서버 연결 전에는 예시 메시지를 보여줍니다.
                </div>
              ) : null}

              {isLoading ? (
                <div className="guestbook-empty preview-empty">
                  방명록을 불러오는 중입니다.
                </div>
              ) : guestbookEntries.length ? (
                guestbookEntries.map((entry) => (
                  <div className="guestbook-message" key={entry.id}>
                    <p>“{entry.message}”</p>
                    <span>
                      {getGuestbookDisplayName(entry.nickname)} ·{" "}
                      {formatGuestbookDate(entry.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="guestbook-empty preview-empty">
                  아직 남겨진 메시지가 없어요.
                </div>
              )}

              <div className="guestbook-button-wrap">
                <Link to="/guestbook" className="btn btn-dark">
                  방명록 보러 가기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;

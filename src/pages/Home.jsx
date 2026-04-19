import { Link } from "react-router-dom";
import useGuestbookEntries from "../hooks/useGuestbookEntries";
import useHomeVideos from "../hooks/useHomeVideos";
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
  const {
    entries: homeVideoEntries,
    error: homeVideoError,
    isLoading: isHomeVideoLoading,
  } = useHomeVideos();
  const activeVideo = homeVideoEntries[0] || null;

  return (
    <div>
      <section className="hero home-layout">
        <div className="container hero-grid">
          <div className="hero-left">
            <span className="badge">Welcome to PINOCCHIO</span>
            <h1>
              우리의 연주를 기록하는
              <br />
              피노키오 동아리 아카이브
            </h1>
            <p className="hero-text">
              악보 보관, 공연 영상 모음, 동아리 일정 관리, 그리고 추억이 쌓이는
              방명록까지 한곳에서 확인할 수 있습니다.
            </p>

            <div className="hero-buttons">
              <Link to="/about" className="btn btn-dark">
                동아리 소개 보기
              </Link>
              <Link to="/guestbook" className="btn btn-light">
                방명록 바로가기
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
                    서버 연결 문제로 잠시 일정을 확인할 수 없습니다.
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
              <p>메인 페이지에서 바로 볼 수 있는 대표 공연 영상입니다.</p>
            </div>

            {homeVideoError ? (
              <div className="guestbook-server-note">
                대표 공연 영상을 불러오지 못해 예시 영상을 먼저 보여주고 있습니다.
              </div>
            ) : null}

            {isHomeVideoLoading ? (
              <div className="guestbook-empty home-video-empty">
                대표 공연 영상을 불러오는 중입니다.
              </div>
            ) : activeVideo ? (
              <div className="home-video-card small-video-card">
                <div className="video-frame small-video-frame">
                  <iframe
                    key={activeVideo.id}
                    src={activeVideo.embedUrl}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                <div className="video-info">
                  <div className="home-video-title-row">
                    <h3>{activeVideo.title}</h3>
                  </div>
                </div>
              </div>
            ) : (
              <div className="guestbook-empty home-video-empty">
                등록된 대표 공연 영상이 없습니다.
              </div>
            )}
          </div>

          <div className="guestbook-column">
            <div className="section-title-wrap">
              <h2>방명록</h2>
              <p>최근 방문자들의 메시지를 바로 확인할 수 있습니다.</p>
            </div>

            <div className="guestbook-preview-card guestbook-side-card">
              {error ? (
                <div className="guestbook-empty preview-empty">
                  서버 연결 문제로 잠시 메시지를 확인할 수 없습니다.
                </div>
              ) : null}

              {isLoading ? (
                <div className="guestbook-empty preview-empty">
                  방명록을 불러오는 중입니다.
                </div>
              ) : guestbookEntries.length ? (
                guestbookEntries.map((entry) => (
                  <div className="guestbook-message" key={entry.id}>
                    <p>{entry.message}</p>
                    <span>
                      {getGuestbookDisplayName(entry.nickname)} ·{" "}
                      {formatGuestbookDate(entry.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="guestbook-empty preview-empty">
                  아직 남겨진 메시지가 없습니다.
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

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
  const activeVideo = homeVideoEntries.find((entry) => entry.isHomeFeatured) || null;

  return (
    <div className="home-page">
      <section className="hero home-layout">
        <div className="container hero-grid">
          <div className="hero-left">
            <span className="badge">Pusan National University Pan Flute Club</span>
            <p className="hero-kicker">Pinocchio Archive</p>
            <h1>
              팬플룻으로 이어온 시간을
              <br />
              한곳에 모아둔 동아리 아카이브
            </h1>
            <p className="hero-text">
              악보, 공연 영상, 동아리 일정, 방명록까지 피노키오의 주요 기록을 한눈에
              둘러볼 수 있도록 정리했습니다.
            </p>

            <div className="hero-buttons">
              <Link to="/about" className="btn btn-dark">
                동아리 소개 보기
              </Link>
              <Link to="/scores" className="btn btn-light">
                악보 저장소 둘러보기
              </Link>
            </div>

            <div className="hero-stats">
              <article className="hero-stat">
                <strong>Archive</strong>
                <span>연습과 공연에 필요한 자료를 한 공간에 정리해 둡니다.</span>
              </article>
              <article className="hero-stat">
                <strong>Schedule</strong>
                <span>다가오는 모임과 공연 일정을 빠르게 확인할 수 있습니다.</span>
              </article>
              <article className="hero-stat">
                <strong>Moments</strong>
                <span>대표 공연 영상과 방문자 메시지로 최근 활동을 남깁니다.</span>
              </article>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-aside-stack">
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

              <div className="quick-links-card">
                <p className="quick-links-eyebrow">Quick Access</p>
                <h3>바로 둘러보기</h3>
                <div className="quick-links-list">
                  <Link to="/videos">대표 공연 영상 보기</Link>
                  <Link to="/guestbook">방명록 남기기</Link>
                  <Link to="/schedule">월간 일정 확인</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-overview-section">
        <div className="container overview-grid">
          <article className="overview-card">
            <div className="overview-card-head">
              <span className="overview-card-label">About</span>
              <h3>동아리 소개</h3>
            </div>
            <p className="overview-card-copy">
              피노키오의 활동 방향과 아카이브가 담고 있는 정보를 간결하게 살펴볼 수 있습니다.
            </p>
            <Link to="/about" className="overview-card-link">
              소개 페이지 보기
            </Link>
          </article>

          <article className="overview-card">
            <div className="overview-card-head">
              <span className="overview-card-label">Scores</span>
              <h3>악보 저장소</h3>
            </div>
            <p className="overview-card-copy">
              공연 준비용 편곡본부터 개인 연습 자료까지 분류별로 정리된 악보를 탐색해 보세요.
            </p>
            <Link to="/scores" className="overview-card-link">
              악보실 열기
            </Link>
          </article>

          <article className="overview-card">
            <div className="overview-card-head">
              <span className="overview-card-label">Performances</span>
              <h3>공연 영상</h3>
            </div>
            <p className="overview-card-copy">
              홈페이지 대표 영상과 카테고리별 공연 기록을 통해 최근 활동 분위기를 확인할 수 있습니다.
            </p>
            <Link to="/videos" className="overview-card-link">
              영상 모아보기
            </Link>
          </article>
        </div>
      </section>

      <section className="media-guestbook-section compact-section">
        <div className="container media-guestbook-grid">
          <div className="media-column">
            <div className="section-title-wrap">
              <h2>대표 공연 영상</h2>
              <p>홈페이지에 대표 영상으로 선택된 최근 공연 기록입니다.</p>
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
                  {activeVideo.description ? (
                    <p className="videos-description">{activeVideo.description}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="guestbook-empty home-video-empty">
                홈페이지용으로 설정된 대표 공연 영상이 없습니다.
              </div>
            )}
          </div>

          <div className="guestbook-column">
            <div className="section-title-wrap">
              <h2>방명록</h2>
              <p>최근 방문자들이 남긴 메시지와 응원을 바로 확인할 수 있습니다.</p>
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

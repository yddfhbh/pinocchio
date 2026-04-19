import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/Dialog";
import useGuestbookEntries from "../hooks/useGuestbookEntries";
import useHomeVideos from "../hooks/useHomeVideos";
import useScheduleEntries from "../hooks/useScheduleEntries";
import { formatGuestbookDate, getGuestbookDisplayName } from "../lib/guestbook";
import {
  deleteHomeVideoEntry,
  HOME_VIDEO_TITLE_LIMIT,
  HOME_VIDEO_URL_LIMIT,
  saveHomeVideoEntry,
} from "../lib/homeVideos";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCategoryLabel,
} from "../lib/schedule";

function Home({ isAdmin }) {
  const { entries: guestbookEntries, error, isLoading } = useGuestbookEntries(3);
  const {
    entries: scheduleEntries,
    error: scheduleError,
    isLoading: isScheduleLoading,
  } = useScheduleEntries(3);
  const {
    entries: homeVideoEntries,
    setEntries: setHomeVideoEntries,
    error: homeVideoError,
    isLoading: isHomeVideoLoading,
    isFallbackData,
    markLiveData,
  } = useHomeVideos();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [formValues, setFormValues] = useState({
    title: "",
    sourceUrl: "",
  });
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  useEffect(() => {
    if (homeVideoEntries.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentVideoIndex((currentIndex) => (currentIndex + 1) % homeVideoEntries.length);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [homeVideoEntries.length]);

  const activeVideoIndex = homeVideoEntries.length
    ? currentVideoIndex % homeVideoEntries.length
    : 0;
  const activeVideo = homeVideoEntries[activeVideoIndex] || null;

  const resetVideoForm = () => {
    setFormValues({
      title: "",
      sourceUrl: "",
    });
  };

  const handleVideoSubmit = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    setIsSubmitting(true);

    try {
      const entry = await saveHomeVideoEntry(formValues);

      setHomeVideoEntries((currentEntries) =>
        isFallbackData ? [entry] : [...currentEntries, entry]
      );
      markLiveData();
      resetVideoForm();
      setCurrentVideoIndex(0);
      setFormStatus({
        type: "success",
        text: "대표 공연 영상을 등록했습니다.",
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "대표 공연 영상을 등록하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) {
      return;
    }

    setFormStatus(null);
    setIsSubmitting(true);

    try {
      await deleteHomeVideoEntry(videoToDelete.id);
      setHomeVideoEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== videoToDelete.id)
      );
      markLiveData();
      setFormStatus({
        type: "success",
        text: "대표 공연 영상을 삭제했습니다.",
      });
    } catch (deleteError) {
      setFormStatus({
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "대표 공연 영상을 삭제하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
      setVideoToDelete(null);
    }
  };

  return (
    <div>
      <section className="hero home-layout">
        <div className="container hero-grid">
          <div className="hero-left">
            <span className="badge">Welcome to PINOCCHIO</span>
            <h1>
              우리들의 연주를 기록하는
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
                    서버 연결 전에도 예시 일정은 확인할 수 있습니다.
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
                    {homeVideoEntries.length > 1 ? (
                      <span className="home-video-rotation-badge">
                        {activeVideoIndex + 1} / {homeVideoEntries.length}
                      </span>
                    ) : null}
                  </div>
                  <p>
                    {homeVideoEntries.length > 1
                      ? "등록된 대표 공연 영상을 5초 간격으로 번갈아 보여주고 있습니다."
                      : "등록된 대표 공연 영상을 메인 페이지에서 바로 감상할 수 있습니다."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="guestbook-empty home-video-empty">
                등록된 대표 공연 영상이 없습니다.
              </div>
            )}

            {isAdmin ? (
              <div className="home-video-admin-card">
                <div className="home-video-admin-head">
                  <h3>대표 영상 관리</h3>
                  <span>{isFallbackData ? "예시 데이터 표시 중" : `${homeVideoEntries.length}개 등록됨`}</span>
                </div>

                <form className="home-video-admin-form" onSubmit={handleVideoSubmit}>
                  <label className="guestbook-label" htmlFor="home-video-title">
                    영상 제목
                  </label>
                  <input
                    id="home-video-title"
                    type="text"
                    placeholder="예: 2026 정기공연 하이라이트"
                    value={formValues.title}
                    maxLength={HOME_VIDEO_TITLE_LIMIT}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />

                  <label className="guestbook-label" htmlFor="home-video-url">
                    영상 URL
                  </label>
                  <input
                    id="home-video-url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formValues.sourceUrl}
                    maxLength={HOME_VIDEO_URL_LIMIT}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        sourceUrl: event.target.value,
                      }))
                    }
                  />

                  <p className="home-video-admin-hint">
                    유튜브 `watch`, `youtu.be`, `shorts`, `embed` 주소를 등록할 수 있습니다.
                  </p>

                  <div className="schedule-form-actions">
                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "등록 중.." : "영상 등록"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={resetVideoForm}
                      disabled={isSubmitting}
                    >
                      입력 초기화
                    </button>
                  </div>
                </form>

                {formStatus ? (
                  <p className={`guestbook-status is-${formStatus.type}`}>{formStatus.text}</p>
                ) : null}

                <div className="home-video-admin-list">
                  {homeVideoEntries.length ? (
                    homeVideoEntries.map((entry) => (
                      <article className="home-video-admin-item" key={entry.id}>
                        <div className="home-video-admin-item-text">
                          <strong>{entry.title}</strong>
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="home-video-admin-link"
                          >
                            {entry.sourceUrl}
                          </a>
                        </div>
                        <button
                          type="button"
                          className="btn btn-light home-video-delete-button"
                          disabled={isSubmitting || isFallbackData}
                          onClick={() => setVideoToDelete(entry)}
                        >
                          삭제
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="guestbook-empty home-video-empty">
                      등록된 대표 공연 영상이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="guestbook-column">
            <div className="section-title-wrap">
              <h2>방명록</h2>
              <p>최근 방문자와 부원들의 메시지를 바로 확인할 수 있습니다.</p>
            </div>

            <div className="guestbook-preview-card guestbook-side-card">
              {error ? (
                <div className="guestbook-empty preview-empty">
                  서버 연결 전에도 예시 메시지는 확인할 수 있습니다.
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
        <ConfirmDialog
          open={!!videoToDelete}
          title="대표 공연 영상 삭제"
          message={
            videoToDelete ? `"${videoToDelete.title}" 영상을 삭제할까요?` : ""
          }
          confirmLabel="삭제"
          tone="danger"
          isSubmitting={isSubmitting}
          onConfirm={handleDeleteVideo}
          onClose={() => {
            if (!isSubmitting) {
              setVideoToDelete(null);
            }
          }}
        />
      </section>
    </div>
  );
}

export default Home;

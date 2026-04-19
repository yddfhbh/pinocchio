import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../components/Dialog";
import useHomeVideos from "../hooks/useHomeVideos";
import {
  deleteHomeVideoEntry,
  getHomeVideoCategoryLabel,
  HOME_VIDEO_CATEGORIES,
  HOME_VIDEO_TITLE_LIMIT,
  HOME_VIDEO_URL_LIMIT,
  saveHomeVideoEntry,
} from "../lib/homeVideos";

function Videos({ isAdmin }) {
  const {
    entries: homeVideoEntries,
    setEntries: setHomeVideoEntries,
    error: homeVideoError,
    isLoading: isHomeVideoLoading,
    isFallbackData,
    markLiveData,
  } = useHomeVideos();
  const [selectedCategory, setSelectedCategory] = useState(HOME_VIDEO_CATEGORIES[0].value);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    sourceUrl: "",
    category: HOME_VIDEO_CATEGORIES[0].value,
  });
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const filteredEntries = useMemo(
    () => homeVideoEntries.filter((entry) => entry.category === selectedCategory),
    [homeVideoEntries, selectedCategory]
  );

  useEffect(() => {
    const hasSelectedCategory = homeVideoEntries.some(
      (entry) => entry.category === selectedCategory
    );

    if (!hasSelectedCategory) {
      const nextCategory =
        HOME_VIDEO_CATEGORIES.find((category) =>
          homeVideoEntries.some((entry) => entry.category === category.value)
        )?.value || HOME_VIDEO_CATEGORIES[0].value;

      setSelectedCategory(nextCategory);
    }
  }, [homeVideoEntries, selectedCategory]);

  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (filteredEntries.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentVideoIndex((currentIndex) => (currentIndex + 1) % filteredEntries.length);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [filteredEntries.length]);

  const activeVideoIndex = filteredEntries.length
    ? currentVideoIndex % filteredEntries.length
    : 0;
  const activeVideo = filteredEntries[activeVideoIndex] || null;

  const resetVideoForm = () => {
    setFormValues({
      title: "",
      sourceUrl: "",
      category: selectedCategory,
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
      setSelectedCategory(entry.category);
      setFormValues({
        title: "",
        sourceUrl: "",
        category: entry.category,
      });
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
    <section className="page-section">
      <div className="container videos-page-layout">
        <div className="videos-page-header">
          <div className="videos-page-title">
            <h2>공연 영상</h2>
            <p className="page-description">
              유튜브에 업로드된 동아리 공연 영상을 모아보는 공간입니다.
            </p>
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="btn btn-dark videos-admin-toggle"
              onClick={() => setIsManagerOpen((current) => !current)}
            >
              {isManagerOpen ? "대표 영상 관리 닫기" : "대표 영상 관리"}
            </button>
          ) : null}
        </div>

        {homeVideoError ? (
          <div className="guestbook-server-note">
            대표 공연 영상을 불러오지 못해 예시 영상을 먼저 보여주고 있습니다.
          </div>
        ) : null}

        <div className="videos-page-content">
          <div className="videos-category-list" role="tablist" aria-label="공연 영상 분류">
            {HOME_VIDEO_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category.value}
                className={`videos-category-button${
                  selectedCategory === category.value ? " is-active" : ""
                }`}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="videos-page-main">
            {isHomeVideoLoading ? (
              <div className="guestbook-empty home-video-empty">
                대표 공연 영상을 불러오는 중입니다.
              </div>
            ) : activeVideo ? (
              <div className="home-video-card videos-main-card">
                <div className="video-frame">
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
                    <div className="videos-title-block">
                      <span className="videos-category-badge">
                        {getHomeVideoCategoryLabel(activeVideo.category)}
                      </span>
                      <h3>{activeVideo.title}</h3>
                    </div>
                    {filteredEntries.length > 1 ? (
                      <span className="home-video-rotation-badge">
                        {activeVideoIndex + 1} / {filteredEntries.length}
                      </span>
                    ) : null}
                  </div>
                  <p>
                    {filteredEntries.length > 1
                      ? "선택한 탭의 영상을 5초 간격으로 번갈아 보여주고 있습니다."
                      : "선택한 탭에 등록된 대표 공연 영상입니다."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="guestbook-empty home-video-empty">
                {getHomeVideoCategoryLabel(selectedCategory)} 탭에는 아직 등록된 영상이 없습니다.
              </div>
            )}
          </div>
        </div>

        {isAdmin && isManagerOpen ? (
          <div className="home-video-admin-card">
            <div className="home-video-admin-head">
              <h3>대표 영상 관리</h3>
              <span>
                {isFallbackData ? "예시 데이터를 표시 중" : `${homeVideoEntries.length}개 등록됨`}
              </span>
            </div>

            <form className="home-video-admin-form" onSubmit={handleVideoSubmit}>
              <label className="guestbook-label" htmlFor="home-video-category">
                카테고리
              </label>
              <select
                id="home-video-category"
                value={formValues.category}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                {HOME_VIDEO_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

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
                <button type="submit" className="btn btn-dark" disabled={isSubmitting}>
                  {isSubmitting ? "등록 중..." : "영상 등록"}
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
                      <span className="videos-category-badge">
                        {getHomeVideoCategoryLabel(entry.category)}
                      </span>
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

        <ConfirmDialog
          open={!!videoToDelete}
          title="대표 공연 영상 삭제"
          message={videoToDelete ? `"${videoToDelete.title}" 영상을 삭제할까요?` : ""}
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
      </div>
    </section>
  );
}

export default Videos;

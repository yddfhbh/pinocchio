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
  updateHomeVideoEntry,
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
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    sourceUrl: "",
    category: HOME_VIDEO_CATEGORIES[0].value,
    isHomeFeatured: false,
  });
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const filteredEntries = useMemo(
    () => homeVideoEntries.filter((entry) => entry.category === selectedCategory),
    [homeVideoEntries, selectedCategory]
  );
  const featuredVideo = homeVideoEntries.find((entry) => entry.isHomeFeatured) || null;
  const hasFeaturedConflict =
    featuredVideo && (!editingVideoId || featuredVideo.id !== editingVideoId);
  const homeFeatureCheckboxDisabled =
    isSubmitting || (hasFeaturedConflict && !formValues.isHomeFeatured);

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
    if (!filteredEntries.length) {
      if (selectedVideoId) {
        setSelectedVideoId("");
      }
      return;
    }

    const selectedExists = filteredEntries.some((entry) => entry.id === selectedVideoId);

    if (!selectedExists) {
      setSelectedVideoId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedVideoId]);

  useEffect(() => {
    if (!editingVideoId) {
      setFormValues((current) => ({
        ...current,
        category: selectedCategory,
      }));
    }
  }, [selectedCategory, editingVideoId]);

  const activeVideo =
    filteredEntries.find((entry) => entry.id === selectedVideoId) || filteredEntries[0] || null;
  const secondaryVideos = activeVideo
    ? filteredEntries.filter((entry) => entry.id !== activeVideo.id)
    : [];

  const resetVideoForm = () => {
    setEditingVideoId(null);
    setFormValues({
      title: "",
      sourceUrl: "",
      category: selectedCategory,
      isHomeFeatured: false,
    });
    setFormStatus(null);
  };

  const handleVideoSubmit = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    setIsSubmitting(true);

    try {
      const entry = editingVideoId
        ? await updateHomeVideoEntry(editingVideoId, formValues)
        : await saveHomeVideoEntry(formValues);

      setHomeVideoEntries((currentEntries) => {
        if (isFallbackData) {
          return [entry];
        }

        if (editingVideoId) {
          return currentEntries.map((currentEntry) =>
            currentEntry.id === entry.id ? entry : currentEntry
          );
        }

        return [...currentEntries, entry];
      });
      markLiveData();
      setSelectedCategory(entry.category);
      setSelectedVideoId(entry.id);
      setFormStatus({
        type: "success",
        text: editingVideoId
          ? "대표 공연 영상을 수정했습니다."
          : "대표 공연 영상을 등록했습니다.",
      });
      setEditingVideoId(null);
      setFormValues({
        title: "",
        sourceUrl: "",
        category: entry.category,
        isHomeFeatured: false,
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : editingVideoId
              ? "대표 공연 영상을 수정하지 못했습니다."
              : "대표 공연 영상을 등록하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingVideoId(entry.id);
    setFormStatus(null);
    setSelectedCategory(entry.category);
    setSelectedVideoId(entry.id);
    setFormValues({
      title: entry.title,
      sourceUrl: entry.sourceUrl,
      category: entry.category,
      isHomeFeatured: entry.isHomeFeatured,
    });
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

      if (editingVideoId === videoToDelete.id) {
        resetVideoForm();
      }

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
              <>
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
                        <div className="videos-badge-row">
                          <span className="videos-category-badge">
                            {getHomeVideoCategoryLabel(activeVideo.category)}
                          </span>
                          {activeVideo.isHomeFeatured ? (
                            <span className="videos-home-badge">홈페이지 표시 중</span>
                          ) : null}
                        </div>
                        <h3>{activeVideo.title}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {secondaryVideos.length ? (
                  <div className="videos-related-section">
                    <div className="videos-related-grid">
                      {secondaryVideos.map((entry) => (
                        <article key={entry.id} className="home-video-card videos-related-card">
                          <div className="video-frame">
                            <iframe
                              src={entry.embedUrl}
                              title={entry.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>

                          <div className="video-info">
                            <div className="videos-badge-row">
                              <span className="videos-category-badge">
                                {getHomeVideoCategoryLabel(entry.category)}
                              </span>
                              {entry.isHomeFeatured ? (
                                <span className="videos-home-badge">홈페이지 표시 중</span>
                              ) : null}
                            </div>
                            <h3>{entry.title}</h3>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
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

              <label className="home-video-feature-toggle" htmlFor="home-video-featured">
                <input
                  id="home-video-featured"
                  type="checkbox"
                  checked={formValues.isHomeFeatured}
                  disabled={homeFeatureCheckboxDisabled}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      isHomeFeatured: event.target.checked,
                    }))
                  }
                />
                <span>홈페이지용 영상으로 사용</span>
              </label>

              <p className="home-video-admin-hint">
                홈 화면에는 이 설정이 켜진 영상 1개만 표시됩니다.
              </p>

              {hasFeaturedConflict ? (
                <p className="home-video-admin-hint is-warning">
                  현재 "{featuredVideo.title}" 영상이 홈페이지용으로 설정되어 있어 이 옵션을 켤 수
                  없습니다.
                </p>
              ) : null}

              <p className="home-video-admin-hint">
                유튜브 `watch`, `youtu.be`, `shorts`, `embed` 주소를 등록할 수 있습니다.
              </p>

              <div className="schedule-form-actions">
                <button type="submit" className="btn btn-dark" disabled={isSubmitting}>
                  {isSubmitting
                    ? editingVideoId
                      ? "수정 중..."
                      : "등록 중..."
                    : editingVideoId
                      ? "영상 수정"
                      : "영상 등록"}
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={resetVideoForm}
                  disabled={isSubmitting}
                >
                  {editingVideoId ? "편집 취소" : "입력 초기화"}
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
                      <div className="videos-badge-row">
                        <span className="videos-category-badge">
                          {getHomeVideoCategoryLabel(entry.category)}
                        </span>
                        {entry.isHomeFeatured ? (
                          <span className="videos-home-badge">홈페이지 표시 중</span>
                        ) : null}
                      </div>
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

                    <div className="home-video-admin-actions">
                      <button
                        type="button"
                        className="btn btn-light home-video-delete-button"
                        disabled={isSubmitting}
                        onClick={() => handleStartEdit(entry)}
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        className="btn btn-light home-video-delete-button"
                        disabled={isSubmitting || isFallbackData}
                        onClick={() => setVideoToDelete(entry)}
                      >
                        삭제
                      </button>
                    </div>
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

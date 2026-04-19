import { useMemo, useState } from "react";
import { ConfirmDialog, DialogFrame } from "../components/Dialog";
import useScoreEntries from "../hooks/useScoreEntries";
import {
  deleteScoreEntry,
  formatScoreDate,
  formatScoreFileSize,
  getScoreCategoryLabel,
  getScoreDifficultyLabel,
  MAX_SCORE_FILE_SIZE,
  normalizeScoreEntries,
  saveScoreEntry,
  uploadScoreFile,
} from "../lib/scores";

const defaultCategory = "합주";
const defaultDifficulty = "중급";
const scoreCategoryOptions = ["합주", "공연 준비", "개인 연습", "파트 자료", "기타"];
const difficultyOptions = ["기초", "중급", "상급"];

function createEmptyFormValues() {
  return {
    id: "",
    title: "",
    composer: "",
    arranger: "",
    category: defaultCategory,
    instrumentation: "",
    difficulty: defaultDifficulty,
    sourceUrl: "",
    fileName: "",
    fileSize: null,
    description: "",
  };
}

function Scores({ isAdmin }) {
  const { entries, setEntries, isLoading, error } = useScoreEntries();
  const [selectedId, setSelectedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState(createEmptyFormValues);
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(entries.map((entry) => getScoreCategoryLabel(entry.category)))
    );

    return ["all", ...uniqueCategories];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesCategory =
        activeCategory === "all" || getScoreCategoryLabel(entry.category) === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        entry.title,
        entry.composer,
        entry.arranger,
        entry.instrumentation,
        entry.description,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, entries, searchQuery]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) || filteredEntries[0] || null;

  const resetForm = () => {
    setFormMode("create");
    setFormValues(createEmptyFormValues());
    setUploadFile(null);
    setUploadProgress(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormStatus(null);
    setIsFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    setFormStatus(null);
    setIsFormDialogOpen(false);
  };

  const handleEdit = (entry) => {
    setFormMode("edit");
    setFormValues({
      id: entry.id,
      title: entry.title,
      composer: entry.composer || "",
      arranger: entry.arranger || "",
      category: entry.category || defaultCategory,
      instrumentation: entry.instrumentation || "",
      difficulty: entry.difficulty || defaultDifficulty,
      sourceUrl: entry.sourceUrl,
      fileName: entry.fileName || "",
      fileSize: entry.fileSize ?? null,
      description: entry.description || "",
    });
    setSelectedId(entry.id);
    setUploadFile(null);
    setUploadProgress(null);
    setFormStatus(null);
    setIsFormDialogOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    setIsSubmitting(true);

    try {
      const nextPayload = {
        ...formValues,
      };

      if (!nextPayload.sourceUrl && !uploadFile) {
        throw new Error("악보 링크를 입력하거나 PDF 파일을 선택해 주세요.");
      }

      if (uploadFile) {
        if (uploadFile.type && uploadFile.type !== "application/pdf") {
          throw new Error("PDF 파일만 업로드할 수 있습니다.");
        }

        if (uploadFile.size > MAX_SCORE_FILE_SIZE) {
          throw new Error("PDF 파일은 10MB 이하만 업로드할 수 있습니다.");
        }

        setUploadProgress({
          loaded: 0,
          total: uploadFile.size,
          percentage: 0,
        });

        const uploadedBlob = await uploadScoreFile(uploadFile, ({ loaded, total, percentage }) => {
          setUploadProgress({
            loaded,
            total,
            percentage,
          });
        });

        setUploadProgress({
          loaded: uploadFile.size,
          total: uploadFile.size,
          percentage: 100,
        });
        nextPayload.sourceUrl = uploadedBlob.url;
        nextPayload.fileName = uploadFile.name;
        nextPayload.fileSize = uploadFile.size;
      }

      const entry = await saveScoreEntry(nextPayload, formMode);

      setEntries((currentEntries) => {
        const nextEntries =
          formMode === "edit"
            ? currentEntries.map((currentEntry) =>
                currentEntry.id === entry.id ? entry : currentEntry
              )
            : [...currentEntries, entry];

        return normalizeScoreEntries(nextEntries);
      });
      setSelectedId(entry.id);
      setIsFormDialogOpen(false);
      resetForm();
      setFormStatus({
        type: "success",
        text:
          formMode === "edit"
            ? "악보 정보를 수정했습니다."
            : "새 악보를 저장소에 등록했습니다.",
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error ? saveError.message : "악보를 저장하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) {
      return;
    }

    setFormStatus(null);
    setIsSubmitting(true);

    try {
      await deleteScoreEntry(entryToDelete.id);
      setEntries((currentEntries) =>
        currentEntries.filter((currentEntry) => currentEntry.id !== entryToDelete.id)
      );

      if (formValues.id === entryToDelete.id) {
        setIsFormDialogOpen(false);
        resetForm();
      }

      setFormStatus({
        type: "success",
        text: "악보를 저장소에서 삭제했습니다.",
      });
      setEntryToDelete(null);
    } catch (deleteError) {
      setFormStatus({
        type: "error",
        text:
          deleteError instanceof Error ? deleteError.message : "악보를 삭제하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="container">
        <div className="scores-page-header">
          <div className="scores-page-title">
            <h2>악보 저장소</h2>
            <p className="page-description">
              공연 준비 자료, 합주용 편곡본, 개인 연습 악보를 한곳에서 검색하고 바로 열어볼
              수 있습니다.
            </p>
          </div>
          <div className="scores-page-actions">
            <button type="button" className="btn btn-dark scores-register-button" onClick={openCreateForm}>
              악보 등록
            </button>
            {isAdmin ? <span className="scores-admin-chip">관리자 편집 가능</span> : null}
          </div>
        </div>

        {error ? (
          <div className="guestbook-server-note">
            서버 연결이 준비되지 않아 예시 악보를 보여주고 있습니다.
          </div>
        ) : null}

        <div className="scores-toolbar">
          <label className="scores-search" htmlFor="score-search">
            <span>악보 검색</span>
            <input
              id="score-search"
              type="search"
              placeholder="곡명, 작곡가, 편곡자, 편성으로 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <div className="scores-filter-list" role="tablist" aria-label="악보 분류">
            {categories.map((category) => {
              const label = category === "all" ? "전체" : category;

              return (
                <button
                  key={category}
                  type="button"
                  className={`scores-filter-button${
                    activeCategory === category ? " is-active" : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="scores-summary-row">
          <span>{filteredEntries.length}개 악보</span>
          {selectedEntry ? <span>최근 수정 {formatScoreDate(selectedEntry.updatedAt)}</span> : null}
        </div>
        {formStatus ? (
          <p className={`guestbook-status scores-status-message is-${formStatus.type}`}>
            {formStatus.text}
          </p>
        ) : null}

        <div className="scores-page-layout">
          <div className="scores-library-panel">
            <div className="scores-library-head">
              <h3>보관함 목록</h3>
              <span>선택한 악보의 상세 정보를 오른쪽에서 확인하세요.</span>
            </div>

            {isLoading ? (
              <div className="guestbook-empty">악보 목록을 불러오는 중입니다.</div>
            ) : filteredEntries.length ? (
              <div className="scores-library-list">
                {filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`scores-library-card${isSelected ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <div className="scores-library-card-top">
                        <span className="scores-category-badge">
                          {getScoreCategoryLabel(entry.category)}
                        </span>
                        <span>{getScoreDifficultyLabel(entry.difficulty)}</span>
                      </div>
                      <h4>{entry.title}</h4>
                      <p>
                        {entry.composer ? `작곡 ${entry.composer}` : "작곡자 미상"}
                        {entry.arranger ? ` · 편곡 ${entry.arranger}` : ""}
                      </p>
                      <div className="scores-library-meta">
                        <span>{entry.instrumentation || "편성 미기재"}</span>
                        <span>{formatScoreDate(entry.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="guestbook-empty">
                조건에 맞는 악보가 없습니다. 검색어나 카테고리를 바꿔 보세요.
              </div>
            )}
          </div>

          <div className="scores-side-column">
            <div className="scores-detail-card">
              <div className="scores-detail-head">
                <div>
                  <span className="scores-category-badge">
                    {selectedEntry
                      ? getScoreCategoryLabel(selectedEntry.category)
                      : "악보 미선택"}
                  </span>
                  <h3>{selectedEntry ? selectedEntry.title : "악보를 선택해 주세요"}</h3>
                </div>
                {selectedEntry ? (
                  <span className="scores-updated-label">
                    업데이트 {formatScoreDate(selectedEntry.updatedAt)}
                  </span>
                ) : null}
              </div>

              {selectedEntry ? (
                <>
                  <div className="scores-meta-grid">
                    <div className="scores-meta-item">
                      <strong>작곡</strong>
                      <span>{selectedEntry.composer || "-"}</span>
                    </div>
                    <div className="scores-meta-item">
                      <strong>편곡</strong>
                      <span>{selectedEntry.arranger || "-"}</span>
                    </div>
                    <div className="scores-meta-item">
                      <strong>편성</strong>
                      <span>{selectedEntry.instrumentation || "-"}</span>
                    </div>
                    <div className="scores-meta-item">
                      <strong>난이도</strong>
                      <span>{getScoreDifficultyLabel(selectedEntry.difficulty)}</span>
                    </div>
                    <div className="scores-meta-item">
                      <strong>파일명</strong>
                      <span>{selectedEntry.fileName || "외부 링크"}</span>
                    </div>
                    <div className="scores-meta-item">
                      <strong>파일 크기</strong>
                      <span>{formatScoreFileSize(selectedEntry.fileSize)}</span>
                    </div>
                  </div>

                  <div className="scores-description-block">
                    <h4>메모</h4>
                    <p>{selectedEntry.description || "등록된 메모가 없습니다."}</p>
                  </div>

                  <div className="scores-detail-actions">
                    <a
                      className="btn btn-dark"
                      href={selectedEntry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      악보 열기
                    </a>
                    <a
                      className="btn btn-light"
                      href={selectedEntry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      새 탭에서 보기
                    </a>
                  </div>

                  {isAdmin ? (
                    <div className="scores-detail-admin-actions">
                      <button
                        type="button"
                        className="btn btn-light scores-action-button"
                        onClick={() => handleEdit(selectedEntry)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn-light scores-action-button"
                        onClick={() => setEntryToDelete(selectedEntry)}
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="guestbook-empty">
                  왼쪽 목록에서 악보를 선택하면 곡 정보와 링크를 확인할 수 있습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFrame
          open={isFormDialogOpen}
          title={formMode === "edit" ? "악보 수정" : "악보 등록"}
          message={
            formMode === "edit"
              ? "등록된 악보 정보를 수정합니다."
              : "일반 유저도 등록할 수 있고, 수정과 삭제는 관리자만 가능합니다."
          }
          className="dialog-card-wide"
          onClose={closeFormDialog}
        >
          <form className="scores-admin-form" onSubmit={handleSave}>
            <label className="guestbook-label" htmlFor="score-title">
              곡명
            </label>
            <input
              id="score-title"
              type="text"
              maxLength={120}
              placeholder="예: Libertango"
              value={formValues.title}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
            />

            <div className="scores-form-grid">
              <div>
                <label className="guestbook-label" htmlFor="score-composer">
                  작곡
                </label>
                <input
                  id="score-composer"
                  type="text"
                  maxLength={80}
                  placeholder="작곡가 이름"
                  value={formValues.composer}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      composer: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="guestbook-label" htmlFor="score-arranger">
                  편곡
                </label>
                <input
                  id="score-arranger"
                  type="text"
                  maxLength={80}
                  placeholder="편곡자 또는 출처"
                  value={formValues.arranger}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      arranger: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="scores-form-grid">
              <div>
                <label className="guestbook-label" htmlFor="score-category">
                  분류
                </label>
                <select
                  id="score-category"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {scoreCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="guestbook-label" htmlFor="score-difficulty">
                  난이도
                </label>
                <select
                  id="score-difficulty"
                  value={formValues.difficulty}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      difficulty: event.target.value,
                    }))
                  }
                >
                  {difficultyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="guestbook-label" htmlFor="score-instrumentation">
              편성
            </label>
            <input
              id="score-instrumentation"
              type="text"
              maxLength={60}
              placeholder="예: Flute Trio / Solo Flute"
              value={formValues.instrumentation}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  instrumentation: event.target.value,
                }))
              }
            />

            <label className="guestbook-label" htmlFor="score-url">
              외부 링크
            </label>
            <input
              id="score-url"
              type="url"
              placeholder="파일 업로드 대신 링크를 쓸 경우만 입력"
              value={formValues.sourceUrl}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  sourceUrl: event.target.value,
                }))
              }
            />

            <label className="guestbook-label" htmlFor="score-file">
              PDF 파일 업로드
            </label>
            <input
              id="score-file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isSubmitting}
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setUploadFile(file);
                setUploadProgress(
                  file
                    ? {
                        loaded: 0,
                        total: file.size,
                        percentage: 0,
                      }
                    : null
                );
              }}
            />
            <p className="scores-admin-hint">
              Vercel Blob 업로드는 현재 10MB 이하 PDF 기준으로 연결했습니다.
              {uploadFile
                ? ` 선택한 파일: ${uploadFile.name} (${formatScoreFileSize(uploadFile.size)})`
                : " 파일을 올리면 자동으로 저장소 링크가 생성됩니다."}
            </p>
            {uploadFile && uploadProgress ? (
              <div
                className="scores-upload-progress"
                aria-live="polite"
                aria-label="PDF upload progress"
              >
                <div className="scores-upload-progress-head">
                  <strong>{isSubmitting ? "PDF 업로드 진행률" : "업로드 준비됨"}</strong>
                  <span>{Math.round(uploadProgress.percentage)}%</span>
                </div>
                <div className="scores-upload-progress-bar" aria-hidden="true">
                  <span
                    className="scores-upload-progress-fill"
                    style={{ width: `${Math.min(uploadProgress.percentage, 100)}%` }}
                  ></span>
                </div>
                <p className="scores-upload-progress-text">
                  {formatScoreFileSize(uploadProgress.loaded)} /{" "}
                  {formatScoreFileSize(uploadProgress.total)}
                </p>
              </div>
            ) : null}

            <label className="guestbook-label" htmlFor="score-description">
              메모
            </label>
            <textarea
              id="score-description"
              rows="4"
              maxLength={500}
              placeholder="연습 포인트나 사용 목적을 적어 주세요."
              value={formValues.description}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            ></textarea>

            <p className="scores-admin-hint">
              파일을 업로드하면 Blob URL이 저장되고, 링크만 입력하면 외부 악보 자료도 함께
              보관할 수 있습니다.
            </p>

            <div className="schedule-form-actions">
              {formMode === "edit" ? (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={openCreateForm}
                  disabled={isSubmitting}
                >
                  새로 등록
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-light"
                onClick={closeFormDialog}
                disabled={isSubmitting}
              >
                닫기
              </button>
              <button type="submit" className="btn btn-dark" disabled={isSubmitting || !!error}>
                {isSubmitting
                  ? uploadFile
                    ? "업로드 중..."
                    : "저장 중..."
                  : formMode === "edit"
                    ? "악보 수정"
                    : "악보 등록"}
              </button>
            </div>

            {!isAdmin ? (
              <p className="scores-admin-hint">
                등록한 항목의 수정과 삭제는 관리자에게 요청해 주세요.
              </p>
            ) : null}
          </form>
        </DialogFrame>

        <ConfirmDialog
          open={!!entryToDelete}
          title="악보 삭제"
          message={entryToDelete ? `"${entryToDelete.title}" 악보를 삭제할까요?` : ""}
          confirmLabel="삭제"
          tone="danger"
          isSubmitting={isSubmitting}
          onConfirm={handleDelete}
          onClose={() => {
            if (!isSubmitting) {
              setEntryToDelete(null);
            }
          }}
        />
      </div>
    </section>
  );
}

export default Scores;

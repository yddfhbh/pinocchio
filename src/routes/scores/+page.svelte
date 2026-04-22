<script>
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import DialogFrame from "$lib/components/DialogFrame.svelte";
  import { adminSession } from "$lib/state/admin-session.svelte.js";
  import { createScoreEntriesState } from "$lib/state/score-entries.svelte.js";
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
  } from "$lib/scores";

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

  const { scores, reload } = createScoreEntriesState();
  const admin = adminSession.state;

  let selectedId = $state("");
  let searchQuery = $state("");
  let activeCategory = $state("all");
  let formMode = $state("create");
  let formValues = $state(createEmptyFormValues());
  let formStatus = $state(null);
  let isSubmitting = $state(false);
  let uploadFile = $state(null);
  let uploadProgress = $state(null);
  let entryToDelete = $state(null);
  let isFormDialogOpen = $state(false);

  const categories = $derived.by(() => {
    const uniqueCategories = Array.from(
      new Set(scores.entries.map((entry) => getScoreCategoryLabel(entry.category)))
    );

    return ["all", ...uniqueCategories];
  });

  const filteredEntries = $derived.by(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return scores.entries.filter((entry) => {
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
  });

  const selectedEntry = $derived(
    filteredEntries.find((entry) => entry.id === selectedId) || filteredEntries[0] || null
  );

  $effect(() => {
    void reload();
  });

  function resetForm() {
    formMode = "create";
    formValues = createEmptyFormValues();
    uploadFile = null;
    uploadProgress = null;
  }

  function openCreateForm() {
    if (!admin.isAdmin) {
      formStatus = {
        type: "error",
        text: "Admin access is required to add or edit scores.",
      };
      return;
    }

    resetForm();
    formStatus = null;
    isFormDialogOpen = true;
  }

  function closeFormDialog() {
    if (isSubmitting) {
      return;
    }

    resetForm();
    formStatus = null;
    isFormDialogOpen = false;
  }

  function handleEdit(entry) {
    formMode = "edit";
    formValues = {
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
    };
    selectedId = entry.id;
    uploadFile = null;
    uploadProgress = null;
    formStatus = null;
    isFormDialogOpen = true;
  }

  async function handleSave(event) {
    event.preventDefault();
    formStatus = null;

    if (!admin.isAdmin) {
      formStatus = {
        type: "error",
        text: "Admin access is required to add or edit scores.",
      };
      return;
    }

    isSubmitting = true;

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

        uploadProgress = {
          loaded: 0,
          total: uploadFile.size,
          percentage: 0,
        };

        const uploadedBlob = await uploadScoreFile(uploadFile, ({ loaded, total, percentage }) => {
          uploadProgress = {
            loaded,
            total,
            percentage,
          };
        });

        uploadProgress = {
          loaded: uploadFile.size,
          total: uploadFile.size,
          percentage: 100,
        };
        nextPayload.sourceUrl = uploadedBlob.url;
        nextPayload.fileName = uploadFile.name;
        nextPayload.fileSize = uploadFile.size;
      }

      const entry = await saveScoreEntry(nextPayload, formMode);

      scores.entries = normalizeScoreEntries(
        formMode === "edit"
          ? scores.entries.map((currentEntry) =>
              currentEntry.id === entry.id ? entry : currentEntry
            )
          : [...scores.entries, entry]
      );
      selectedId = entry.id;
      isFormDialogOpen = false;
      resetForm();
      formStatus = {
        type: "success",
        text:
          formMode === "edit"
            ? "악보 정보를 수정했습니다."
            : "새 악보를 저장소에 등록했습니다.",
      };
    } catch (saveError) {
      formStatus = {
        type: "error",
        text:
          saveError instanceof Error ? saveError.message : "악보를 저장하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    if (!entryToDelete) {
      return;
    }

    formStatus = null;
    isSubmitting = true;

    try {
      await deleteScoreEntry(entryToDelete.id);
      scores.entries = scores.entries.filter(
        (currentEntry) => currentEntry.id !== entryToDelete.id
      );

      if (formValues.id === entryToDelete.id) {
        isFormDialogOpen = false;
        resetForm();
      }

      formStatus = {
        type: "success",
        text: "악보를 저장소에서 삭제했습니다.",
      };
      entryToDelete = null;
    } catch (deleteError) {
      formStatus = {
        type: "error",
        text:
          deleteError instanceof Error ? deleteError.message : "악보를 삭제하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section class="page-section">
  <div class="container">
    <div class="scores-page-header">
      <div class="scores-page-title">
        <h2>악보 저장소</h2>
        <p class="page-description">
          공연 준비 자료, 합주용 편곡본, 개인 연습 악보를 한곳에서 검색하고 바로 열어볼
          수 있습니다.
        </p>
      </div>
      <div class="scores-page-actions">
        {#if admin.isAdmin}
          <button
            type="button"
            class="btn btn-dark scores-register-button"
            onclick={openCreateForm}
          >
            악보 등록
          </button>
        {/if}
        {#if admin.isAdmin}
          <span class="scores-admin-chip">관리자 편집 가능</span>
        {/if}
      </div>
    </div>

    {#if scores.error}
      <div class="guestbook-server-note">
        서버 연결이 준비되지 않아 예시 악보를 보여주고 있습니다.
      </div>
    {/if}

    <div class="scores-toolbar">
      <label class="scores-search" for="score-search">
        <span>악보 검색</span>
        <input
          id="score-search"
          type="search"
          placeholder="곡명, 작곡가, 편곡자, 편성으로 검색"
          bind:value={searchQuery}
        />
      </label>

      <div class="scores-filter-list" role="tablist" aria-label="악보 분류">
        {#each categories as category (category)}
          <button
            type="button"
            class={`scores-filter-button${activeCategory === category ? " is-active" : ""}`}
            onclick={() => {
              activeCategory = category;
            }}
          >
            {category === "all" ? "전체" : category}
          </button>
        {/each}
      </div>
    </div>

    <div class="scores-summary-row">
      <span>{filteredEntries.length}개 악보</span>
      {#if selectedEntry}
        <span>최근 수정 {formatScoreDate(selectedEntry.updatedAt)}</span>
      {/if}
    </div>

    {#if formStatus}
      <p class={`guestbook-status scores-status-message is-${formStatus.type}`}>
        {formStatus.text}
      </p>
    {/if}

    <div class="scores-page-layout">
      <div class="scores-library-panel">
        <div class="scores-library-head">
          <h3>보관함 목록</h3>
          <span>선택한 악보의 상세 정보를 오른쪽에서 확인하세요.</span>
        </div>

        {#if scores.isLoading}
          <div class="guestbook-empty">악보 목록을 불러오는 중입니다.</div>
        {:else if filteredEntries.length}
          <div class="scores-library-list">
            {#each filteredEntries as entry (entry.id)}
              <button
                type="button"
                class={`scores-library-card${selectedEntry?.id === entry.id ? " is-selected" : ""}`}
                onclick={() => {
                  selectedId = entry.id;
                }}
              >
                <div class="scores-library-card-top">
                  <span class="scores-category-badge">
                    {getScoreCategoryLabel(entry.category)}
                  </span>
                  <span>{getScoreDifficultyLabel(entry.difficulty)}</span>
                </div>
                <h4>{entry.title}</h4>
                <p>
                  {entry.composer ? `작곡 ${entry.composer}` : "작곡자 미상"}
                  {entry.arranger ? ` · 편곡 ${entry.arranger}` : ""}
                </p>
                <div class="scores-library-meta">
                  <span>{entry.instrumentation || "편성 미기재"}</span>
                  <span>{formatScoreDate(entry.updatedAt)}</span>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="guestbook-empty">
            조건에 맞는 악보가 없습니다. 검색어나 카테고리를 바꿔 보세요.
          </div>
        {/if}
      </div>

      <div class="scores-side-column">
        <div class="scores-detail-card">
          <div class="scores-detail-head">
            <div>
              <span class="scores-category-badge">
                {selectedEntry ? getScoreCategoryLabel(selectedEntry.category) : "악보 미선택"}
              </span>
              <h3>{selectedEntry ? selectedEntry.title : "악보를 선택해 주세요"}</h3>
            </div>
            {#if selectedEntry}
              <span class="scores-updated-label">
                업데이트 {formatScoreDate(selectedEntry.updatedAt)}
              </span>
            {/if}
          </div>

          {#if selectedEntry}
            <div class="scores-meta-grid">
              <div class="scores-meta-item">
                <strong>작곡</strong>
                <span>{selectedEntry.composer || "-"}</span>
              </div>
              <div class="scores-meta-item">
                <strong>편곡</strong>
                <span>{selectedEntry.arranger || "-"}</span>
              </div>
              <div class="scores-meta-item">
                <strong>편성</strong>
                <span>{selectedEntry.instrumentation || "-"}</span>
              </div>
              <div class="scores-meta-item">
                <strong>난이도</strong>
                <span>{getScoreDifficultyLabel(selectedEntry.difficulty)}</span>
              </div>
              <div class="scores-meta-item">
                <strong>파일명</strong>
                <span>{selectedEntry.fileName || "외부 링크"}</span>
              </div>
              <div class="scores-meta-item">
                <strong>파일 크기</strong>
                <span>{formatScoreFileSize(selectedEntry.fileSize)}</span>
              </div>
            </div>

            <div class="scores-description-block">
              <h4>메모</h4>
              <p>{selectedEntry.description || "등록된 메모가 없습니다."}</p>
            </div>

            <div class="scores-detail-actions">
              <a class="btn btn-dark" href={selectedEntry.sourceUrl} target="_blank" rel="noreferrer">
                악보 열기
              </a>
              <a class="btn btn-light" href={selectedEntry.sourceUrl} target="_blank" rel="noreferrer">
                새 탭에서 보기
              </a>
            </div>

            {#if admin.isAdmin}
              <div class="scores-detail-admin-actions">
                <button
                  type="button"
                  class="btn btn-light scores-action-button"
                  onclick={() => handleEdit(selectedEntry)}
                >
                  수정
                </button>
                <button
                  type="button"
                  class="btn btn-light scores-action-button"
                  onclick={() => {
                    entryToDelete = selectedEntry;
                  }}
                >
                  삭제
                </button>
              </div>
            {/if}
          {:else}
            <div class="guestbook-empty">
              왼쪽 목록에서 악보를 선택하면 곡 정보와 링크를 확인할 수 있습니다.
            </div>
          {/if}
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
      closeOnBackdrop={false}
      onClose={closeFormDialog}
    >
      <form class="scores-admin-form" onsubmit={handleSave}>
        <label class="guestbook-label" for="score-title">
          곡명
        </label>
        <input
          id="score-title"
          type="text"
          maxlength="120"
          placeholder="예: Libertango"
          bind:value={formValues.title}
          required
        />

        <div class="scores-form-grid">
          <div>
            <label class="guestbook-label" for="score-composer">
              작곡
            </label>
            <input
              id="score-composer"
              type="text"
              maxlength="80"
              placeholder="작곡가 이름"
              bind:value={formValues.composer}
            />
          </div>

          <div>
            <label class="guestbook-label" for="score-arranger">
              편곡
            </label>
            <input
              id="score-arranger"
              type="text"
              maxlength="80"
              placeholder="편곡자 또는 출처"
              bind:value={formValues.arranger}
            />
          </div>
        </div>

        <div class="scores-form-grid">
          <div>
            <label class="guestbook-label" for="score-category">
              분류
            </label>
            <select id="score-category" bind:value={formValues.category}>
              {#each scoreCategoryOptions as option (option)}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="guestbook-label" for="score-difficulty">
              난이도
            </label>
            <select id="score-difficulty" bind:value={formValues.difficulty}>
              {#each difficultyOptions as option (option)}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>
        </div>

        <label class="guestbook-label" for="score-instrumentation">
          편성
        </label>
        <input
          id="score-instrumentation"
          type="text"
          maxlength="60"
          placeholder="예: Flute Trio / Solo Flute"
          bind:value={formValues.instrumentation}
        />

        <label class="guestbook-label" for="score-url">
          외부 링크
        </label>
        <input
          id="score-url"
          type="url"
          placeholder="파일 업로드 대신 링크를 쓸 경우만 입력"
          bind:value={formValues.sourceUrl}
        />

        <label class="guestbook-label" for="score-file">
          PDF 파일 업로드
        </label>
        <input
          id="score-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={isSubmitting}
          onchange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            uploadFile = file;
            uploadProgress = file
              ? {
                  loaded: 0,
                  total: file.size,
                  percentage: 0,
                }
              : null;
          }}
        />
        {#if uploadFile}
          <p class="scores-admin-hint">
            선택한 파일: {uploadFile.name} ({formatScoreFileSize(uploadFile.size)})
          </p>
        {/if}
        {#if uploadFile && uploadProgress}
          <div
            class="scores-upload-progress"
            aria-live="polite"
            aria-label="PDF upload progress"
          >
            <div class="scores-upload-progress-head">
              <strong>{isSubmitting ? "PDF 업로드 진행률" : "업로드 준비됨"}</strong>
              <span>{Math.round(uploadProgress.percentage)}%</span>
            </div>
            <div class="scores-upload-progress-bar" aria-hidden="true">
              <span
                class="scores-upload-progress-fill"
                style={`width: ${Math.min(uploadProgress.percentage, 100)}%`}
              ></span>
            </div>
            <p class="scores-upload-progress-text">
              {formatScoreFileSize(uploadProgress.loaded)} / {formatScoreFileSize(uploadProgress.total)}
            </p>
          </div>
        {/if}

        <label class="guestbook-label" for="score-description">
          메모
        </label>
        <textarea
          id="score-description"
          rows="4"
          maxlength="500"
          placeholder="연습 포인트나 사용 목적을 적어 주세요."
          bind:value={formValues.description}
        ></textarea>

        <div class="schedule-form-actions">
          {#if formMode === "edit"}
            <button
              type="button"
              class="btn btn-light"
              onclick={openCreateForm}
              disabled={isSubmitting}
            >
              새로 등록
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-light"
            onclick={closeFormDialog}
            disabled={isSubmitting}
          >
            닫기
          </button>
          <button type="submit" class="btn btn-dark" disabled={isSubmitting || !!scores.error}>
            {isSubmitting
              ? uploadFile
                ? "업로드 중..."
                : "저장 중..."
              : formMode === "edit"
                ? "악보 수정"
                : "악보 등록"}
          </button>
        </div>

        {#if !admin.isAdmin}
          <p class="scores-admin-hint">
            등록한 항목의 수정과 삭제는 관리자에게 요청해 주세요.
          </p>
        {/if}
      </form>
    </DialogFrame>

    <ConfirmDialog
      open={!!entryToDelete}
      title="악보 삭제"
      message={entryToDelete ? `"${entryToDelete.title}" 악보를 삭제할까요?` : ""}
      confirmLabel="삭제"
      tone="danger"
      {isSubmitting}
      onConfirm={handleDelete}
      onClose={() => {
        if (!isSubmitting) {
          entryToDelete = null;
        }
      }}
    />
  </div>
</section>

<script>
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { adminSession } from "$lib/state/admin-session.svelte.js";
  import { createHomeVideosState } from "$lib/state/home-videos.svelte.js";
  import {
    deleteHomeVideoEntry,
    getHomeVideoCategoryLabel,
    HOME_VIDEO_CATEGORIES,
    HOME_VIDEO_DESCRIPTION_LIMIT,
    HOME_VIDEO_TITLE_LIMIT,
    HOME_VIDEO_URL_LIMIT,
    saveHomeVideoEntry,
    updateHomeVideoEntry,
  } from "$lib/homeVideos";

  function createEmptyFormValues(category = HOME_VIDEO_CATEGORIES[0].value) {
    return {
      title: "",
      sourceUrl: "",
      description: "",
      category,
      isHomeFeatured: false,
    };
  }

  const { homeVideos, reload, markLiveData } = createHomeVideosState();
  const admin = adminSession.state;

  let selectedCategory = $state(HOME_VIDEO_CATEGORIES[0].value);
  let selectedVideoId = $state("");
  let editingVideoId = $state(null);
  let isManagerOpen = $state(false);
  let formValues = $state(createEmptyFormValues());
  let formStatus = $state(null);
  let isSubmitting = $state(false);
  let videoToDelete = $state(null);

  const activeCategory = $derived.by(() => {
    const hasActiveCategory =
      HOME_VIDEO_CATEGORIES.some((category) => category.value === selectedCategory) &&
      homeVideos.entries.some((entry) => entry.category === selectedCategory);

    if (hasActiveCategory) {
      return selectedCategory;
    }

    return (
      HOME_VIDEO_CATEGORIES.find((category) =>
        homeVideos.entries.some((entry) => entry.category === category.value)
      )?.value || HOME_VIDEO_CATEGORIES[0].value
    );
  });

  const filteredEntries = $derived(
    homeVideos.entries.filter((entry) => entry.category === activeCategory)
  );
  const featuredVideo = $derived(
    homeVideos.entries.find((entry) => entry.isHomeFeatured) || null
  );
  const hasFeaturedConflict = $derived(
    !!featuredVideo && (!editingVideoId || featuredVideo.id !== editingVideoId)
  );
  const homeFeatureCheckboxDisabled = $derived(
    isSubmitting || (hasFeaturedConflict && !formValues.isHomeFeatured)
  );
  const activeVideo = $derived(
    filteredEntries.find((entry) => entry.id === selectedVideoId) || filteredEntries[0] || null
  );
  const secondaryVideos = $derived(
    activeVideo
      ? filteredEntries.filter((entry) => entry.id !== activeVideo.id)
      : []
  );

  $effect(() => {
    void reload();
  });

  function resetVideoForm() {
    editingVideoId = null;
    formValues = createEmptyFormValues(activeCategory);
    formStatus = null;
  }

  async function handleVideoSubmit(event) {
    event.preventDefault();
    formStatus = null;
    isSubmitting = true;

    try {
      const entry = editingVideoId
        ? await updateHomeVideoEntry(editingVideoId, { ...formValues })
        : await saveHomeVideoEntry({ ...formValues });

      if (homeVideos.isFallbackData) {
        homeVideos.entries = [entry];
      } else if (editingVideoId) {
        homeVideos.entries = homeVideos.entries.map((currentEntry) =>
          currentEntry.id === entry.id ? entry : currentEntry
        );
      } else {
        homeVideos.entries = [...homeVideos.entries, entry];
      }

      markLiveData();
      selectedCategory = entry.category;
      selectedVideoId = entry.id;
      formStatus = {
        type: "success",
        text: editingVideoId
          ? "대표 공연 영상을 수정했습니다."
          : "대표 공연 영상을 등록했습니다.",
      };
      editingVideoId = null;
      formValues = createEmptyFormValues(entry.category);
    } catch (saveError) {
      formStatus = {
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : editingVideoId
              ? "대표 공연 영상을 수정하지 못했습니다."
              : "대표 공연 영상을 등록하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }

  function handleStartEdit(entry) {
    editingVideoId = entry.id;
    formStatus = null;
    selectedCategory = entry.category;
    selectedVideoId = entry.id;
    formValues = {
      title: entry.title,
      sourceUrl: entry.sourceUrl,
      description: entry.description || "",
      category: entry.category,
      isHomeFeatured: entry.isHomeFeatured,
    };
  }

  async function handleDeleteVideo() {
    if (!videoToDelete) {
      return;
    }

    formStatus = null;
    isSubmitting = true;

    try {
      await deleteHomeVideoEntry(videoToDelete.id);
      homeVideos.entries = homeVideos.entries.filter((entry) => entry.id !== videoToDelete.id);
      markLiveData();

      if (editingVideoId === videoToDelete.id) {
        resetVideoForm();
      }

      formStatus = {
        type: "success",
        text: "대표 공연 영상을 삭제했습니다.",
      };
    } catch (deleteError) {
      formStatus = {
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "대표 공연 영상을 삭제하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
      videoToDelete = null;
    }
  }
</script>

<section class="page-section">
  <div class="container videos-page-layout">
    <div class="videos-page-header">
      <div class="videos-page-title">
        <h2>공연 영상</h2>
        <p class="page-description">
          유튜브에 업로드된 동아리 공연 영상을 모아보는 공간입니다.
        </p>
      </div>

      {#if admin.isAdmin}
        <button
          type="button"
          class="btn btn-dark videos-admin-toggle"
          onclick={() => {
            isManagerOpen = !isManagerOpen;
          }}
        >
          {isManagerOpen ? "대표 영상 관리 닫기" : "대표 영상 관리"}
        </button>
      {/if}
    </div>

    {#if homeVideos.error}
      <div class="guestbook-server-note">
        대표 공연 영상을 불러오지 못해 예시 영상을 먼저 보여주고 있습니다.
      </div>
    {/if}

    <div class="videos-page-content">
      <div class="videos-category-list" role="tablist" aria-label="공연 영상 분류">
        {#each HOME_VIDEO_CATEGORIES as category (category.value)}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === category.value}
            class={`videos-category-button${activeCategory === category.value ? " is-active" : ""}`}
            onclick={() => {
              selectedCategory = category.value;

              if (!editingVideoId) {
                formValues.category = category.value;
              }
            }}
          >
            {category.label}
          </button>
        {/each}
      </div>

      <div class="videos-page-main">
        {#if homeVideos.isLoading}
          <div class="guestbook-empty home-video-empty">
            대표 공연 영상을 불러오는 중입니다.
          </div>
        {:else if activeVideo}
          <div class="home-video-card videos-main-card">
            <div class="video-frame">
              {#key activeVideo.id}
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              {/key}
            </div>

            <div class="video-info">
              <div class="home-video-title-row">
                <div class="videos-title-block">
                  <div class="videos-badge-row">
                    <span class="videos-category-badge">
                      {getHomeVideoCategoryLabel(activeVideo.category)}
                    </span>
                    {#if activeVideo.isHomeFeatured}
                      <span class="videos-home-badge">홈페이지 표시 중</span>
                    {/if}
                  </div>
                  <h3>{activeVideo.title}</h3>
                  {#if activeVideo.description}
                    <p class="videos-description">{activeVideo.description}</p>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          {#if secondaryVideos.length}
            <div class="videos-related-section">
              <div class="videos-related-grid">
                {#each secondaryVideos as entry (entry.id)}
                  <article class="home-video-card videos-related-card">
                    <div class="video-frame">
                      <iframe
                        src={entry.embedUrl}
                        title={entry.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                      ></iframe>
                    </div>

                    <div class="video-info">
                      <div class="videos-badge-row">
                        <span class="videos-category-badge">
                          {getHomeVideoCategoryLabel(entry.category)}
                        </span>
                        {#if entry.isHomeFeatured}
                          <span class="videos-home-badge">홈페이지 표시 중</span>
                        {/if}
                      </div>
                      <h3>{entry.title}</h3>
                      {#if entry.description}
                        <p class="videos-description">{entry.description}</p>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}
        {:else}
          <div class="guestbook-empty home-video-empty">
            {getHomeVideoCategoryLabel(selectedCategory)} 탭에는 아직 등록된 영상이 없습니다.
          </div>
        {/if}
      </div>
    </div>

    {#if admin.isAdmin && isManagerOpen}
      <div class="home-video-admin-card">
        <div class="home-video-admin-head">
          <h3>대표 영상 관리</h3>
          <span>
            {homeVideos.isFallbackData ? "예시 데이터를 표시 중" : `${homeVideos.entries.length}개 등록됨`}
          </span>
        </div>

        <form class="home-video-admin-form" onsubmit={handleVideoSubmit}>
          <label class="guestbook-label" for="home-video-category">
            카테고리
          </label>
          <select id="home-video-category" bind:value={formValues.category}>
            {#each HOME_VIDEO_CATEGORIES as category (category.value)}
              <option value={category.value}>{category.label}</option>
            {/each}
          </select>

          <label class="guestbook-label" for="home-video-title">
            영상 제목
          </label>
          <input
            id="home-video-title"
            type="text"
            placeholder="예: 2026 정기공연 하이라이트"
            maxlength={HOME_VIDEO_TITLE_LIMIT}
            bind:value={formValues.title}
          />

          <label class="guestbook-label" for="home-video-url">
            영상 URL
          </label>
          <input
            id="home-video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            maxlength={HOME_VIDEO_URL_LIMIT}
            bind:value={formValues.sourceUrl}
          />

          <label class="guestbook-label" for="home-video-description">
            설명
          </label>
          <textarea
            id="home-video-description"
            rows="4"
            maxlength={HOME_VIDEO_DESCRIPTION_LIMIT}
            placeholder="영상 아래에 함께 보여줄 공연 소개나 메모를 적어 주세요."
            bind:value={formValues.description}
          ></textarea>

          <label class="home-video-feature-toggle" for="home-video-featured">
            <input
              id="home-video-featured"
              type="checkbox"
              bind:checked={formValues.isHomeFeatured}
              disabled={homeFeatureCheckboxDisabled}
            />
            <span>홈페이지용 영상으로 사용</span>
          </label>

          <p class="home-video-admin-hint">
            홈 화면에는 이 설정이 켜진 영상 1개만 표시됩니다.
          </p>

          {#if hasFeaturedConflict}
            <p class="home-video-admin-hint is-warning">
              현재 "{featuredVideo.title}" 영상이 홈페이지용으로 설정되어 있어 이 옵션을 켤 수
              없습니다.
            </p>
          {/if}

          <p class="home-video-admin-hint">
            유튜브 `watch`, `youtu.be`, `shorts`, `embed` 주소를 등록할 수 있습니다.
          </p>

          <div class="schedule-form-actions">
            <button type="submit" class="btn btn-dark" disabled={isSubmitting}>
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
              class="btn btn-light"
              onclick={resetVideoForm}
              disabled={isSubmitting}
            >
              {editingVideoId ? "편집 취소" : "입력 초기화"}
            </button>
          </div>
        </form>

        {#if formStatus}
          <p class={`guestbook-status is-${formStatus.type}`}>{formStatus.text}</p>
        {/if}

        <div class="home-video-admin-list">
          {#if homeVideos.entries.length}
            {#each homeVideos.entries as entry (entry.id)}
              <article class="home-video-admin-item">
                <div class="home-video-admin-item-text">
                  <div class="videos-badge-row">
                    <span class="videos-category-badge">
                      {getHomeVideoCategoryLabel(entry.category)}
                    </span>
                    {#if entry.isHomeFeatured}
                      <span class="videos-home-badge">홈페이지 표시 중</span>
                    {/if}
                  </div>
                  <strong>{entry.title}</strong>
                  {#if entry.description}
                    <p class="home-video-admin-description">{entry.description}</p>
                  {/if}
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="home-video-admin-link"
                  >
                    {entry.sourceUrl}
                  </a>
                </div>

                <div class="home-video-admin-actions">
                  <button
                    type="button"
                    class="btn btn-light home-video-delete-button"
                    disabled={isSubmitting}
                    onclick={() => handleStartEdit(entry)}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    class="btn btn-light home-video-delete-button"
                    disabled={isSubmitting || homeVideos.isFallbackData}
                    onclick={() => {
                      videoToDelete = entry;
                    }}
                  >
                    삭제
                  </button>
                </div>
              </article>
            {/each}
          {:else}
            <div class="guestbook-empty home-video-empty">
              등록된 대표 공연 영상이 없습니다.
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <ConfirmDialog
      open={!!videoToDelete}
      title="대표 공연 영상 삭제"
      message={videoToDelete ? `"${videoToDelete.title}" 영상을 삭제할까요?` : ""}
      confirmLabel="삭제"
      tone="danger"
      {isSubmitting}
      onConfirm={handleDeleteVideo}
      onClose={() => {
        if (!isSubmitting) {
          videoToDelete = null;
        }
      }}
    />
  </div>
</section>

<script>
  import { adminSession } from "$lib/state/admin-session.svelte.js";
  import { createAboutContentState } from "$lib/state/about-content.svelte.js";
  import {
    ABOUT_CONTENT_ITEM_LIMIT,
    ABOUT_CONTENT_LIST_LIMIT,
    ABOUT_CONTENT_TEXT_LIMIT,
    ABOUT_CONTENT_TITLE_LIMIT,
    updateAboutContent,
  } from "$lib/aboutContent";

  const ABOUT_PAGE_TITLE = "동아리 소개";

  function toFormValues(content) {
    return {
      intro: content.intro,
      activityTitle: content.activityTitle,
      activities: content.activities.join("\n"),
      websiteTitle: content.websiteTitle,
      websiteItems: content.websiteItems.join("\n"),
    };
  }

  function parseListInput(value) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const { about, reload, markLiveData } = createAboutContentState();
  const admin = adminSession.state;

  let isEditorOpen = $state(false);
  let isSubmitting = $state(false);
  let formStatus = $state(null);
  let formValues = $state(toFormValues(about.content));

  $effect(() => {
    void reload();
  });

  async function handleSubmit(event) {
    event.preventDefault();
    formStatus = null;
    isSubmitting = true;

    try {
      const nextContent = await updateAboutContent({
        intro: formValues.intro,
        activityTitle: formValues.activityTitle,
        activities: parseListInput(formValues.activities),
        websiteTitle: formValues.websiteTitle,
        websiteItems: parseListInput(formValues.websiteItems),
      });

      about.content = nextContent;
      markLiveData();
      formStatus = {
        type: "success",
        text: "동아리 소개 내용을 저장했습니다.",
      };
    } catch (saveError) {
      formStatus = {
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "동아리 소개 내용을 저장하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section class="page-section">
  <div class="container">
    <div class="videos-page-header about-page-header">
      <div class="videos-page-title about-page-title">
        <h2>{ABOUT_PAGE_TITLE}</h2>
        <p class="page-description">{about.content.intro}</p>
      </div>

      {#if admin.isAdmin}
        <button
          type="button"
          class="btn btn-dark videos-admin-toggle about-admin-toggle"
          onclick={() => {
            formStatus = null;
            formValues = toFormValues(about.content);
            isEditorOpen = !isEditorOpen;
          }}
        >
          {isEditorOpen ? "소개 편집 닫기" : "소개 편집"}
        </button>
      {/if}
    </div>

    {#if about.error}
      <div class="guestbook-server-note">
        {about.error}{about.isFallbackData ? " 기본 소개 문구를 먼저 보여주고 있습니다." : ""}
      </div>
    {/if}

    {#if about.isLoading}
      <div class="guestbook-empty">동아리 소개 내용을 불러오는 중입니다.</div>
    {/if}

    <div class="info-box">
      <h3>{about.content.activityTitle}</h3>
      <ul>
        {#each about.content.activities as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    </div>

    <div class="info-box">
      <h3>{about.content.websiteTitle}</h3>
      <ul>
        {#each about.content.websiteItems as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    </div>

    {#if admin.isAdmin && isEditorOpen}
      <div class="schedule-panel">
        <div class="schedule-panel-head">
          <h3>소개 편집</h3>
          <span>{about.isFallbackData ? "기본 내용 표시 중" : "저장 가능"}</span>
        </div>

        <div class="schedule-admin-area">
          <form class="schedule-admin-form" onsubmit={handleSubmit}>
            <p class="schedule-field-hint">
              동아리 소개 수정중...
            </p>

            <label class="guestbook-label" for="about-intro">
              소개 문장
            </label>
            <textarea
              id="about-intro"
              rows="4"
              maxlength={ABOUT_CONTENT_TEXT_LIMIT}
              bind:value={formValues.intro}
            ></textarea>

            <label class="guestbook-label" for="about-activity-title">
              활동 섹션 제목
            </label>
            <input
              id="about-activity-title"
              type="text"
              maxlength={ABOUT_CONTENT_TITLE_LIMIT}
              bind:value={formValues.activityTitle}
            />

            <label class="guestbook-label" for="about-activities">
              활동 목록
            </label>
            <textarea
              id="about-activities"
              rows="6"
              maxlength={ABOUT_CONTENT_ITEM_LIMIT * ABOUT_CONTENT_LIST_LIMIT}
              bind:value={formValues.activities}
            ></textarea>
            <p class="schedule-field-hint">
              한 줄에 한 항목씩 입력하면 목록으로 표시됩니다. 최대 {ABOUT_CONTENT_LIST_LIMIT}개까지
              저장됩니다.
            </p>

            <label class="guestbook-label" for="about-website-title">
              홈페이지 섹션 제목
            </label>
            <input
              id="about-website-title"
              type="text"
              maxlength={ABOUT_CONTENT_TITLE_LIMIT}
              bind:value={formValues.websiteTitle}
            />

            <label class="guestbook-label" for="about-website-items">
              홈페이지 목록
            </label>
            <textarea
              id="about-website-items"
              rows="6"
              maxlength={ABOUT_CONTENT_ITEM_LIMIT * ABOUT_CONTENT_LIST_LIMIT}
              bind:value={formValues.websiteItems}
            ></textarea>
            <p class="schedule-field-hint">
              빈 줄은 저장되지 않으며, 저장 후 바로 페이지 내용에 반영됩니다.
            </p>

            <div class="schedule-form-actions">
              <button type="submit" class="btn btn-dark" disabled={isSubmitting}>
                {isSubmitting ? "저장 중.." : "소개 저장"}
              </button>
              <button
                type="button"
                class="btn btn-light"
                disabled={isSubmitting}
                onclick={() => {
                  formValues = toFormValues(about.content);
                  formStatus = null;
                }}
              >
                변경 취소
              </button>
            </div>

            {#if formStatus}
              <p class={`guestbook-status is-${formStatus.type}`}>{formStatus.text}</p>
            {/if}
          </form>
        </div>
      </div>
    {/if}
  </div>
</section>

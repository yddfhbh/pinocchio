<script>
  import { createGuestbookEntriesState } from "$lib/state/guestbook-entries.svelte.js";
  import { createHomeVideosState } from "$lib/state/home-videos.svelte.js";
  import { createScheduleEntriesState } from "$lib/state/schedule-entries.svelte.js";
  import {
    formatGuestbookDate,
    getGuestbookDisplayName,
  } from "$lib/guestbook";
  import {
    formatScheduleDate,
    formatScheduleTime,
    getCategoryLabel,
  } from "$lib/schedule";

  const { guestbook, reload: reloadGuestbook } = createGuestbookEntriesState(3);
  const { schedule, reload: reloadSchedule } = createScheduleEntriesState(3);
  const { homeVideos, reload: reloadHomeVideos } = createHomeVideosState();

  const activeVideo = $derived(
    homeVideos.entries.find((entry) => entry.isHomeFeatured) || null
  );

  $effect(() => {
    void reloadGuestbook();
    void reloadSchedule();
    void reloadHomeVideos();
  });
</script>

<div>
  <section class="hero home-layout">
    <div class="container hero-grid">
      <div class="hero-left">
        <span class="badge">Welcome to PINOCCHIO</span>
        <h1>
          부산대학교
          <br />
          팬플룻 동아리 피노키오
        </h1>
        <p class="hero-text">
          악보, 공연 영상, 동아리 일정, 그리고
          방명록까지 한곳에서 확인할 수 있습니다.
        </p>

        <div class="hero-buttons">
          <a href="/about" class="btn btn-dark">동아리 소개 보기</a>
          <a href="/guestbook" class="btn btn-light">방명록 바로가기</a>
        </div>
      </div>

      <div class="hero-right">
        <div class="calendar-card">
          <div class="calendar-card-head">
            <h3>다가오는 일정</h3>
            <a href="/schedule" class="calendar-card-link">전체 보기</a>
          </div>

          <div class="calendar-preview-list">
            {#if schedule.error}
              <div class="calendar-empty">
                서버 연결 문제로 잠시 일정을 확인할 수 없습니다.
              </div>
            {/if}

            {#if schedule.isLoading}
              <div class="calendar-empty">일정을 불러오는 중입니다.</div>
            {:else if schedule.entries.length}
              {#each schedule.entries as entry (entry.id)}
                <article class="calendar-preview-item">
                  <div class="calendar-preview-top">
                    <span class="schedule-category-badge">
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span>{formatScheduleTime(entry.startTime, entry.endTime)}</span>
                  </div>
                  <h4>{entry.title}</h4>
                  <p>{formatScheduleDate(entry.eventDate)}</p>
                </article>
              {/each}
            {:else}
              <div class="calendar-empty">등록된 일정이 아직 없습니다.</div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="media-guestbook-section compact-section">
    <div class="container media-guestbook-grid">
      <div class="media-column">
        <div class="section-title-wrap">
          <h2>대표 공연 영상</h2>
          <p>피노키오에서 진행한 가장 최근 공연 입니다.</p>
        </div>

        {#if homeVideos.error}
          <div class="guestbook-server-note">
            대표 공연 영상을 불러오지 못해 예시 영상을 먼저 보여주고 있습니다.
          </div>
        {/if}

        {#if homeVideos.isLoading}
          <div class="guestbook-empty home-video-empty">
            대표 공연 영상을 불러오는 중입니다.
          </div>
        {:else if activeVideo}
          <div class="home-video-card small-video-card">
            <div class="video-frame small-video-frame">
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
                <h3>{activeVideo.title}</h3>
              </div>
              {#if activeVideo.description}
                <p class="videos-description">{activeVideo.description}</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="guestbook-empty home-video-empty">
            홈페이지용으로 설정된 대표 공연 영상이 없습니다.
          </div>
        {/if}
      </div>

      <div class="guestbook-column">
        <div class="section-title-wrap">
          <h2>방명록</h2>
          <p>최근 방문자들의 메시지를 확인할 수 있습니다.</p>
        </div>

        <div class="guestbook-preview-card guestbook-side-card">
          {#if guestbook.error}
            <div class="guestbook-empty preview-empty">
              서버 연결 문제로 잠시 메시지를 확인할 수 없습니다.
            </div>
          {/if}

          {#if guestbook.isLoading}
            <div class="guestbook-empty preview-empty">
              방명록을 불러오는 중입니다.
            </div>
          {:else if guestbook.entries.length}
            {#each guestbook.entries as entry (entry.id)}
              <div class="guestbook-message">
                <p>{entry.message}</p>
                <span>
                  {getGuestbookDisplayName(entry.nickname)} · {formatGuestbookDate(entry.createdAt)}
                </span>
              </div>
            {/each}
          {:else}
            <div class="guestbook-empty preview-empty">
              아직 남겨진 메시지가 없습니다.
            </div>
          {/if}

          <div class="guestbook-button-wrap">
            <a href="/guestbook" class="btn btn-dark">방명록 보러 가기</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

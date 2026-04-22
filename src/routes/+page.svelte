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

<div class="home-page">
  <section class="hero home-layout">
    <div class="container hero-grid">
      <div class="hero-left">
        <span class="badge">Pusan National University Pan Flute Club</span>
        <p class="hero-kicker">Pinocchio Archive</p>
        <h1>
          팬플룻으로 이어온 시간을
          <br />
          한곳에 모아둔 동아리 아카이브
        </h1>
        <p class="hero-text">
          악보, 공연 영상, 동아리 일정, 방명록까지 피노키오의 주요 기록을 한눈에
          둘러볼 수 있도록 정리했습니다.
        </p>

        <div class="hero-buttons">
          <a href="/about" class="btn btn-dark">동아리 소개 보기</a>
          <a href="/scores" class="btn btn-light">악보 저장소 둘러보기</a>
        </div>

        <div class="hero-stats">
          <article class="hero-stat">
            <strong>Archive</strong>
            <span>연습과 공연에 필요한 자료를 한 공간에 정리해 둡니다.</span>
          </article>
          <article class="hero-stat">
            <strong>Schedule</strong>
            <span>다가오는 모임과 공연 일정을 빠르게 확인할 수 있습니다.</span>
          </article>
          <article class="hero-stat">
            <strong>Moments</strong>
            <span>대표 공연 영상과 방문자 메시지로 최근 활동을 남깁니다.</span>
          </article>
        </div>
      </div>

      <div class="hero-right">
        <div class="hero-aside-stack">
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

          <div class="quick-links-card">
            <p class="quick-links-eyebrow">Quick Access</p>
            <h3>바로 둘러보기</h3>
            <div class="quick-links-list">
              <a href="/videos">대표 공연 영상 보기</a>
              <a href="/guestbook">방명록 남기기</a>
              <a href="/schedule">월간 일정 확인</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="home-overview-section">
    <div class="container overview-grid">
      <article class="overview-card">
        <div class="overview-card-head">
          <span class="overview-card-label">About</span>
          <h3>동아리 소개</h3>
        </div>
        <p class="overview-card-copy">
          피노키오의 활동 방향과 아카이브가 담고 있는 정보를 간결하게 살펴볼 수 있습니다.
        </p>
        <a href="/about" class="overview-card-link">소개 페이지 보기</a>
      </article>

      <article class="overview-card">
        <div class="overview-card-head">
          <span class="overview-card-label">Scores</span>
          <h3>악보 저장소</h3>
        </div>
        <p class="overview-card-copy">
          공연 준비용 편곡본부터 개인 연습 자료까지 분류별로 정리된 악보를 탐색해 보세요.
        </p>
        <a href="/scores" class="overview-card-link">악보실 열기</a>
      </article>

      <article class="overview-card">
        <div class="overview-card-head">
          <span class="overview-card-label">Performances</span>
          <h3>공연 영상</h3>
        </div>
        <p class="overview-card-copy">
          홈페이지 대표 영상과 카테고리별 공연 기록을 통해 최근 활동 분위기를 확인할 수 있습니다.
        </p>
        <a href="/videos" class="overview-card-link">영상 모아보기</a>
      </article>
    </div>
  </section>

  <section class="media-guestbook-section compact-section">
    <div class="container media-guestbook-grid">
      <div class="media-column">
        <div class="section-title-wrap">
          <h2>대표 공연 영상</h2>
          <p>홈페이지에 대표 영상으로 선택된 최근 공연 기록입니다.</p>
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
          <p>최근 방문자들이 남긴 메시지와 응원을 바로 확인할 수 있습니다.</p>
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

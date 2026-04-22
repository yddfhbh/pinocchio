<script>
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { adminSession } from "$lib/state/admin-session.svelte.js";
  import { createScheduleEntriesState } from "$lib/state/schedule-entries.svelte.js";
  import {
    addMonths,
    deleteScheduleEntry,
    formatMonthLabel,
    formatScheduleDate,
    formatScheduleTime,
    getCalendarDays,
    getCategoryLabel,
    getMonthWeekdayDates,
    getMonthStart,
    normalizeScheduleEntries,
    saveScheduleEntry,
    toDateKey,
  } from "$lib/schedule";

  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const defaultCategory = "연습";

  const { schedule, reload } = createScheduleEntriesState();
  const admin = adminSession.state;
  const todayKey = toDateKey(new Date());

  let currentMonth = $state(getMonthStart(new Date()));
  let selectedDate = $state(todayKey);
  let formStatus = $state(null);
  let isSubmitting = $state(false);
  let formMode = $state("create");
  let repeatMode = $state("single");
  let repeatWeekdays = $state([]);
  let isRepeatConfirmOpen = $state(false);
  let entryToDelete = $state(null);
  let formValues = $state({
    id: "",
    title: "",
    category: defaultCategory,
    eventDate: todayKey,
    startTime: "",
    endTime: "",
    description: "",
  });

  const calendarDays = $derived(getCalendarDays(currentMonth, schedule.entries));
  const selectedEntries = $derived(
    schedule.entries.filter((entry) => entry.eventDate === selectedDate)
  );
  const repeatDates = $derived.by(() => {
    if (formMode !== "create" || repeatMode !== "monthly") {
      return [];
    }

    return getMonthWeekdayDates(formValues.eventDate, repeatWeekdays);
  });
  const repeatMonthLabel = $derived.by(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formValues.eventDate)) {
      return "";
    }

    return formatMonthLabel(new Date(`${formValues.eventDate}T00:00:00`));
  });
  const repeatWeekdayText = $derived(
    repeatWeekdays.map((weekday) => `${weekdayLabels[weekday]}요일`).join(", ")
  );

  $effect(() => {
    void reload();
  });

  function resetForm(date = selectedDate) {
    formMode = "create";
    repeatMode = "single";
    repeatWeekdays = [];
    formValues = {
      id: "",
      title: "",
      category: defaultCategory,
      eventDate: date,
      startTime: "",
      endTime: "",
      description: "",
    };
  }

  async function saveMonthlyRepeatEntries() {
    isSubmitting = true;

    try {
      const createdEntries = [];

      try {
        for (const eventDate of repeatDates) {
          const entry = await saveScheduleEntry(
            {
              ...formValues,
              eventDate,
            },
            "create"
          );

          createdEntries.push(entry);
        }
      } catch (batchError) {
        if (createdEntries.length) {
          schedule.entries = normalizeScheduleEntries([
            ...schedule.entries,
            ...createdEntries,
          ]);
        }

        throw new Error(
          createdEntries.length
            ? `일부 일정만 등록되었습니다. ${createdEntries.length}개를 저장한 뒤 중단되었습니다. ${
                batchError instanceof Error
                  ? batchError.message
                  : "나머지 일정을 등록하지 못했습니다."
              }`
            : batchError instanceof Error
              ? batchError.message
              : "일정을 저장하지 못했습니다."
        );
      }

      const focusDate = createdEntries[0]?.eventDate || formValues.eventDate;

      schedule.entries = normalizeScheduleEntries([
        ...schedule.entries,
        ...createdEntries,
      ]);
      selectedDate = focusDate;
      currentMonth = getMonthStart(new Date(`${focusDate}T00:00:00`));
      resetForm(focusDate);
      formStatus = {
        type: "success",
        text: `${repeatMonthLabel} ${repeatWeekdayText} 일정 ${createdEntries.length}개를 등록했습니다.`,
      };
    } catch (saveError) {
      formStatus = {
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "일정을 저장하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
      isRepeatConfirmOpen = false;
    }
  }

  async function saveSingleEntry() {
    isSubmitting = true;

    try {
      const entry = await saveScheduleEntry({ ...formValues }, formMode);

      schedule.entries = normalizeScheduleEntries(
        formMode === "edit"
          ? schedule.entries.map((currentEntry) =>
              currentEntry.id === entry.id ? entry : currentEntry
            )
          : [...schedule.entries, entry]
      );
      selectedDate = entry.eventDate;
      currentMonth = getMonthStart(new Date(`${entry.eventDate}T00:00:00`));
      resetForm(entry.eventDate);
      formStatus = {
        type: "success",
        text: formMode === "edit" ? "일정이 수정되었습니다." : "새 일정이 등록되었습니다.",
      };
    } catch (saveError) {
      formStatus = {
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "일정을 저장하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    formStatus = null;
    const isMonthlyRepeat = formMode === "create" && repeatMode === "monthly";

    if (isMonthlyRepeat) {
      if (!repeatDates.length) {
        formStatus = {
          type: "error",
          text: "반복 등록할 요일을 한 개 이상 선택해주세요.",
        };
        return;
      }

      isRepeatConfirmOpen = true;
      return;
    }

    await saveSingleEntry();
  }

  function handleEdit(entry) {
    formMode = "edit";
    repeatMode = "single";
    repeatWeekdays = [];
    formValues = {
      id: entry.id,
      title: entry.title,
      category: entry.category || defaultCategory,
      eventDate: entry.eventDate,
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
      description: entry.description || "",
    };
    selectedDate = entry.eventDate;
    formStatus = null;
  }

  async function handleDelete() {
    if (!entryToDelete) {
      return;
    }

    formStatus = null;
    isSubmitting = true;

    try {
      await deleteScheduleEntry(entryToDelete.id);
      schedule.entries = schedule.entries.filter(
        (currentEntry) => currentEntry.id !== entryToDelete.id
      );
      formStatus = {
        type: "success",
        text: "일정이 삭제되었습니다.",
      };

      if (formValues.id === entryToDelete.id) {
        resetForm(entryToDelete.eventDate);
      }
    } catch (deleteError) {
      formStatus = {
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "일정을 삭제하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
      entryToDelete = null;
    }
  }

  function handleRepeatToggle(checked) {
    if (!checked) {
      repeatMode = "single";
      repeatWeekdays = [];
      return;
    }

    const defaultWeekday = new Date(`${formValues.eventDate}T00:00:00`).getDay();

    repeatMode = "monthly";
    repeatWeekdays = repeatWeekdays.length ? repeatWeekdays : [defaultWeekday];
  }

  function handleRepeatWeekdayChange(weekday) {
    repeatWeekdays = repeatWeekdays.includes(weekday)
      ? repeatWeekdays.filter((currentWeekday) => currentWeekday !== weekday)
      : [...repeatWeekdays, weekday].sort((left, right) => left - right);
  }
</script>

<section class="page-section">
  <div class="container">
    <h2>동아리 일정</h2>
    <p class="page-description">
      연습, 공연, 회의 같은 주요 일정을 달력에서 확인할 수 있습니다.
      관리자 코드로 로그인한 경우에만 일정을 수정할 수 있습니다.
    </p>

    {#if schedule.error}
      <div class="guestbook-server-note">
        서버 연결이 아직 준비되지 않아 예시 일정을 보여주고 있습니다.
      </div>
    {/if}

    <div class="schedule-layout">
      <div class="schedule-main-card">
        <div class="schedule-calendar-toolbar">
          <button
            type="button"
            class="schedule-nav-button"
            onclick={() => {
              currentMonth = addMonths(currentMonth, -1);
            }}
          >
            이전
          </button>
          <h3>{formatMonthLabel(currentMonth)}</h3>
          <button
            type="button"
            class="schedule-nav-button"
            onclick={() => {
              currentMonth = addMonths(currentMonth, 1);
            }}
          >
            다음
          </button>
        </div>

        <div class="schedule-weekdays">
          {#each weekdayLabels as label (label)}
            <span>{label}</span>
          {/each}
        </div>

        <div class="schedule-calendar-grid">
          {#each calendarDays as day (day.key)}
            <button
              type="button"
              class={`schedule-day${day.isCurrentMonth ? "" : " is-muted"}${day.key === selectedDate ? " is-selected" : ""}`}
              onclick={() => {
                selectedDate = day.key;
                currentMonth = getMonthStart(day.date);

                if (formMode === "create") {
                  resetForm(day.key);
                }
              }}
            >
              <div class="schedule-day-top">
                <span class="schedule-day-label">{day.label}</span>
                {#if day.entries.length}
                  <span class="schedule-day-count">{day.entries.length}</span>
                {/if}
              </div>
              <div class="schedule-day-events">
                {#each day.entries.slice(0, 3) as entry (entry.id)}
                  <span class="schedule-day-chip" title={entry.title}>
                    <span class="schedule-day-chip-title">{entry.title}</span>
                  </span>
                {/each}
                {#if day.entries.length > 3}
                  <span class="schedule-more">+{day.entries.length - 3}개 더 보기</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div class="schedule-side">
        <div class="schedule-panel">
          <div class="schedule-panel-head">
            <h3>{formatScheduleDate(selectedDate)}</h3>
            <span>{selectedEntries.length}개 일정</span>
          </div>

          {#if schedule.isLoading}
            <div class="guestbook-empty">일정을 불러오는 중입니다.</div>
          {:else if selectedEntries.length}
            <div class="schedule-entry-list">
              {#each selectedEntries as entry (entry.id)}
                <article class="schedule-entry-card">
                  <div class="schedule-entry-head">
                    <span class="schedule-category-badge">
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span>{formatScheduleTime(entry.startTime, entry.endTime)}</span>
                  </div>
                  <h4>{entry.title}</h4>
                  {#if entry.description}
                    <p>{entry.description}</p>
                  {/if}

                  {#if admin.isAdmin}
                    <div class="schedule-admin-actions">
                      <button
                        type="button"
                        class="btn btn-light schedule-action-button"
                        onclick={() => handleEdit(entry)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        class="btn btn-light schedule-action-button"
                        onclick={() => {
                          entryToDelete = entry;
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
          {:else}
            <div class="guestbook-empty">
              선택한 날짜에는 아직 등록된 일정이 없습니다.
            </div>
          {/if}
        </div>

        {#if admin.isAdmin}
          <div class="schedule-panel">
            <div class="schedule-panel-head">
              <h3>일정 편집</h3>
              <span>수정 가능</span>
            </div>

            <div class="schedule-admin-area">
              <form class="schedule-admin-form" onsubmit={handleSave}>
                <label class="guestbook-label" for="schedule-title">
                  일정 제목
                </label>
                <input
                  id="schedule-title"
                  type="text"
                  placeholder="예: 정기 연습"
                  maxlength="80"
                  bind:value={formValues.title}
                />

                <div class="schedule-form-grid">
                  <div>
                    <label class="guestbook-label" for="schedule-category">
                      구분
                    </label>
                    <select id="schedule-category" bind:value={formValues.category}>
                      <option value="연습">연습</option>
                      <option value="공연">공연</option>
                      <option value="회의">회의</option>
                      <option value="공지">공지</option>
                    </select>
                  </div>

                  <div>
                    <label class="guestbook-label" for="schedule-date">
                      {repeatMode === "monthly" && formMode === "create" ? "기준 날짜" : "날짜"}
                    </label>
                    <input id="schedule-date" type="date" bind:value={formValues.eventDate} />
                    {#if repeatMode === "monthly" && formMode === "create"}
                      <p class="schedule-field-hint">
                        선택한 날짜가 포함된 달 전체를 기준으로 반복 일정을 만듭니다.
                      </p>
                    {/if}
                  </div>
                </div>

                <div class="schedule-form-grid">
                  <div>
                    <label class="guestbook-label" for="schedule-start-time">
                      시작 시간
                    </label>
                    <input
                      id="schedule-start-time"
                      type="time"
                      bind:value={formValues.startTime}
                    />
                  </div>

                  <div>
                    <label class="guestbook-label" for="schedule-end-time">
                      종료 시간
                    </label>
                    <input
                      id="schedule-end-time"
                      type="time"
                      bind:value={formValues.endTime}
                    />
                  </div>
                </div>

                <label class="guestbook-label" for="schedule-description">
                  설명
                </label>
                <textarea
                  id="schedule-description"
                  rows="4"
                  placeholder="장소나 준비물 같은 정보를 적어주세요."
                  bind:value={formValues.description}
                ></textarea>

                {#if formMode === "create"}
                  <div class="schedule-repeat-card">
                    <label class="schedule-repeat-toggle" for="schedule-repeat-monthly">
                      <input
                        id="schedule-repeat-monthly"
                        type="checkbox"
                        checked={repeatMode === "monthly"}
                        onchange={(event) => handleRepeatToggle(event.currentTarget.checked)}
                      />
                      <span>
                        <strong>선택한 요일로 한 달치 반복 일정 만들기</strong>
                        <small>
                          같은 제목과 시간으로 {repeatMonthLabel || "해당 월"} 일정을 한 번에
                          등록합니다.
                        </small>
                      </span>
                    </label>

                    {#if repeatMode === "monthly"}
                      <div class="schedule-repeat-weekdays">
                        {#each weekdayLabels as label, index (label)}
                          <label
                            class={`schedule-repeat-day${repeatWeekdays.includes(index) ? " is-selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={repeatWeekdays.includes(index)}
                              onchange={() => handleRepeatWeekdayChange(index)}
                            />
                            <span>{label}요일</span>
                          </label>
                        {/each}
                      </div>

                      <p class="schedule-repeat-summary">
                        {repeatDates.length
                          ? `${repeatMonthLabel}에 ${repeatWeekdayText} 일정 ${repeatDates.length}개가 생성됩니다.`
                          : "반복 등록할 요일을 선택해주세요."}
                      </p>
                    {/if}
                  </div>
                {/if}

                <div class="schedule-form-actions">
                  <button
                    type="submit"
                    class="btn btn-dark"
                    disabled={isSubmitting || !!schedule.error}
                  >
                    {isSubmitting
                      ? "저장 중..."
                      : formMode === "edit"
                        ? "일정 수정"
                        : "일정 등록"}
                  </button>
                  <button
                    type="button"
                    class="btn btn-light"
                    onclick={() => resetForm()}
                    disabled={isSubmitting}
                  >
                    새 일정 작성
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
    </div>

    <ConfirmDialog
      open={isRepeatConfirmOpen}
      title="반복 일정 등록"
      message={`${repeatMonthLabel}에 ${repeatWeekdayText} 일정 ${repeatDates.length}개를 한 번에 등록할까요?`}
      confirmLabel="등록"
      {isSubmitting}
      onConfirm={saveMonthlyRepeatEntries}
      onClose={() => {
        if (!isSubmitting) {
          isRepeatConfirmOpen = false;
        }
      }}
    />

    <ConfirmDialog
      open={!!entryToDelete}
      title="일정 삭제"
      message={entryToDelete ? `"${entryToDelete.title}" 일정을 삭제할까요?` : ""}
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

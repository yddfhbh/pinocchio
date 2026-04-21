import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/Dialog";
import useScheduleEntries from "../hooks/useScheduleEntries";
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
} from "../lib/schedule";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const defaultCategory = "연습";

function Schedule({ isAdmin }) {
  const { entries, setEntries, isLoading, error } = useScheduleEntries();
  const todayKey = toDateKey(new Date());
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [repeatMode, setRepeatMode] = useState("single");
  const [repeatWeekdays, setRepeatWeekdays] = useState([]);
  const [isRepeatConfirmOpen, setIsRepeatConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [formValues, setFormValues] = useState({
    id: "",
    title: "",
    category: defaultCategory,
    eventDate: todayKey,
    startTime: "",
    endTime: "",
    description: "",
  });

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth, entries),
    [currentMonth, entries]
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => entry.eventDate === selectedDate),
    [entries, selectedDate]
  );

  const repeatDates = useMemo(() => {
    if (formMode !== "create" || repeatMode !== "monthly") {
      return [];
    }

    return getMonthWeekdayDates(formValues.eventDate, repeatWeekdays);
  }, [formMode, formValues.eventDate, repeatMode, repeatWeekdays]);

  const repeatMonthLabel = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formValues.eventDate)) {
      return "";
    }

    return formatMonthLabel(new Date(`${formValues.eventDate}T00:00:00`));
  }, [formValues.eventDate]);

  const repeatWeekdayText = useMemo(
    () => repeatWeekdays.map((weekday) => `${weekdayLabels[weekday]}요일`).join(", "),
    [repeatWeekdays]
  );

  const resetForm = (date = selectedDate) => {
    setFormMode("create");
    setRepeatMode("single");
    setRepeatWeekdays([]);
    setFormValues({
      id: "",
      title: "",
      category: defaultCategory,
      eventDate: date,
      startTime: "",
      endTime: "",
      description: "",
    });
  };

  const saveMonthlyRepeatEntries = async () => {
    setIsSubmitting(true);

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
          setEntries((currentEntries) =>
            normalizeScheduleEntries([...currentEntries, ...createdEntries])
          );
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

      setEntries((currentEntries) =>
        normalizeScheduleEntries([...currentEntries, ...createdEntries])
      );
      setSelectedDate(focusDate);
      setCurrentMonth(getMonthStart(new Date(`${focusDate}T00:00:00`)));
      resetForm(focusDate);
      setFormStatus({
        type: "success",
        text: `${repeatMonthLabel} ${repeatWeekdayText} 일정 ${createdEntries.length}개를 등록했습니다.`,
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "일정을 저장하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
      setIsRepeatConfirmOpen(false);
    }
  };

  const saveSingleEntry = async () => {
    setIsSubmitting(true);

    try {
      const entry = await saveScheduleEntry(formValues, formMode);

      setEntries((currentEntries) => {
        const nextEntries =
          formMode === "edit"
            ? currentEntries.map((currentEntry) =>
                currentEntry.id === entry.id ? entry : currentEntry
              )
            : [...currentEntries, entry];

        return normalizeScheduleEntries(nextEntries);
      });
      setSelectedDate(entry.eventDate);
      setCurrentMonth(getMonthStart(new Date(`${entry.eventDate}T00:00:00`)));
      resetForm(entry.eventDate);
      setFormStatus({
        type: "success",
        text:
          formMode === "edit"
            ? "일정이 수정되었습니다."
            : "새 일정이 등록되었습니다.",
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "일정을 저장하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    const isMonthlyRepeat = formMode === "create" && repeatMode === "monthly";

    if (isMonthlyRepeat) {
      if (!repeatDates.length) {
        setFormStatus({
          type: "error",
          text: "반복 등록할 요일을 한 개 이상 선택해주세요.",
        });
        return;
      }

      setIsRepeatConfirmOpen(true);
      return;
    }

    await saveSingleEntry();
  };

  const handleEdit = (entry) => {
    setFormMode("edit");
    setRepeatMode("single");
    setRepeatWeekdays([]);
    setFormValues({
      id: entry.id,
      title: entry.title,
      category: entry.category || defaultCategory,
      eventDate: entry.eventDate,
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
      description: entry.description || "",
    });
    setSelectedDate(entry.eventDate);
    setFormStatus(null);
  };

  const handleDelete = async () => {
    if (!entryToDelete) {
      return;
    }

    setFormStatus(null);
    setIsSubmitting(true);

    try {
      await deleteScheduleEntry(entryToDelete.id);
      setEntries((currentEntries) =>
        currentEntries.filter((currentEntry) => currentEntry.id !== entryToDelete.id)
      );
      setFormStatus({
        type: "success",
        text: "일정이 삭제되었습니다.",
      });

      if (formValues.id === entryToDelete.id) {
        resetForm(entryToDelete.eventDate);
      }
    } catch (deleteError) {
      setFormStatus({
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "일정을 삭제하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
      setEntryToDelete(null);
    }
  };

  const handleRepeatToggle = (checked) => {
    if (!checked) {
      setRepeatMode("single");
      setRepeatWeekdays([]);
      return;
    }

    const defaultWeekday = new Date(`${formValues.eventDate}T00:00:00`).getDay();

    setRepeatMode("monthly");
    setRepeatWeekdays((currentWeekdays) =>
      currentWeekdays.length ? currentWeekdays : [defaultWeekday]
    );
  };

  const handleRepeatWeekdayChange = (weekday) => {
    setRepeatWeekdays((currentWeekdays) =>
      currentWeekdays.includes(weekday)
        ? currentWeekdays.filter((currentWeekday) => currentWeekday !== weekday)
        : [...currentWeekdays, weekday].sort((left, right) => left - right)
    );
  };

  return (
    <section className="page-section">
      <div className="container">
        <h2>동아리 일정</h2>
        <p className="page-description">
          연습, 공연, 회의 같은 주요 일정을 달력에서 확인할 수 있습니다.
          관리자 코드로 로그인한 경우에만 일정을 수정할 수 있습니다.
        </p>

        {error ? (
          <div className="guestbook-server-note">
            서버 연결이 아직 준비되지 않아 예시 일정을 보여주고 있습니다.
          </div>
        ) : null}

        <div className="schedule-layout">
          <div className="schedule-main-card">
            <div className="schedule-calendar-toolbar">
              <button
                type="button"
                className="schedule-nav-button"
                onClick={() => setCurrentMonth((month) => addMonths(month, -1))}
              >
                이전
              </button>
              <h3>{formatMonthLabel(currentMonth)}</h3>
              <button
                type="button"
                className="schedule-nav-button"
                onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
              >
                다음
              </button>
            </div>

            <div className="schedule-weekdays">
              {weekdayLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="schedule-calendar-grid">
              {calendarDays.map((day) => {
                const isSelected = day.key === selectedDate;

                return (
                  <button
                    key={day.key}
                    type="button"
                    className={`schedule-day${
                      day.isCurrentMonth ? "" : " is-muted"
                    }${isSelected ? " is-selected" : ""}`}
                    onClick={() => {
                      setSelectedDate(day.key);
                      setCurrentMonth(getMonthStart(day.date));

                      if (formMode === "create") {
                        resetForm(day.key);
                      }
                    }}
                  >
                    <div className="schedule-day-top">
                      <span className="schedule-day-label">{day.label}</span>
                      {day.entries.length ? (
                        <span className="schedule-day-count">{day.entries.length}</span>
                      ) : null}
                    </div>
                    <div className="schedule-day-events">
                      {day.entries.slice(0, 3).map((entry) => (
                        <span key={entry.id} className="schedule-day-chip" title={entry.title}>
                          <span className="schedule-day-chip-title">{entry.title}</span>
                        </span>
                      ))}
                      {day.entries.length > 3 ? (
                        <span className="schedule-more">+{day.entries.length - 3}개 더 보기</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-side">
            <div className="schedule-panel">
              <div className="schedule-panel-head">
                <h3>{formatScheduleDate(selectedDate)}</h3>
                <span>{selectedEntries.length}개 일정</span>
              </div>

              {isLoading ? (
                <div className="guestbook-empty">일정을 불러오는 중입니다.</div>
              ) : selectedEntries.length ? (
                <div className="schedule-entry-list">
                  {selectedEntries.map((entry) => (
                    <article className="schedule-entry-card" key={entry.id}>
                      <div className="schedule-entry-head">
                        <span className="schedule-category-badge">
                          {getCategoryLabel(entry.category)}
                        </span>
                        <span>{formatScheduleTime(entry.startTime, entry.endTime)}</span>
                      </div>
                      <h4>{entry.title}</h4>
                      {entry.description ? <p>{entry.description}</p> : null}

                      {isAdmin ? (
                        <div className="schedule-admin-actions">
                          <button
                            type="button"
                            className="btn btn-light schedule-action-button"
                            onClick={() => handleEdit(entry)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="btn btn-light schedule-action-button"
                            onClick={() => setEntryToDelete(entry)}
                          >
                            삭제
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="guestbook-empty">
                  선택한 날짜에는 아직 등록된 일정이 없습니다.
                </div>
              )}
            </div>

            {isAdmin ? (
              <div className="schedule-panel">
              <div className="schedule-panel-head">
                <h3>일정 편집</h3>
                {isAdmin ? <span>수정 가능</span> : <span>관리자 전용</span>}
              </div>

              
                {formMode === "readonly" ? <div className="guestbook-empty schedule-admin-empty">
                  헤더의 방명록 옆 관리자 버튼으로 로그인하면 이곳에서 일정을 수정할
                  수 있습니다.
                </div> : null}
              
                <div className="schedule-admin-area">
                  <form className="schedule-admin-form" onSubmit={handleSave}>
                    <label className="guestbook-label" htmlFor="schedule-title">
                      일정 제목
                    </label>
                    <input
                      id="schedule-title"
                      type="text"
                      placeholder="예: 정기 연습"
                      value={formValues.title}
                      maxLength={80}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />

                    <div className="schedule-form-grid">
                      <div>
                        <label className="guestbook-label" htmlFor="schedule-category">
                          구분
                        </label>
                        <select
                          id="schedule-category"
                          value={formValues.category}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              category: event.target.value,
                            }))
                          }
                        >
                          <option value="연습">연습</option>
                          <option value="공연">공연</option>
                          <option value="회의">회의</option>
                          <option value="공지">공지</option>
                        </select>
                      </div>

                      <div>
                        <label className="guestbook-label" htmlFor="schedule-date">
                          {repeatMode === "monthly" && formMode === "create"
                            ? "기준 날짜"
                            : "날짜"}
                        </label>
                        <input
                          id="schedule-date"
                          type="date"
                          value={formValues.eventDate}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              eventDate: event.target.value,
                            }))
                          }
                        />
                        {repeatMode === "monthly" && formMode === "create" ? (
                          <p className="schedule-field-hint">
                            선택한 날짜가 포함된 달 전체를 기준으로 반복 일정을 만듭니다.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="schedule-form-grid">
                      <div>
                        <label className="guestbook-label" htmlFor="schedule-start-time">
                          시작 시간
                        </label>
                        <input
                          id="schedule-start-time"
                          type="time"
                          value={formValues.startTime}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              startTime: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="guestbook-label" htmlFor="schedule-end-time">
                          종료 시간
                        </label>
                        <input
                          id="schedule-end-time"
                          type="time"
                          value={formValues.endTime}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              endTime: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <label className="guestbook-label" htmlFor="schedule-description">
                      설명
                    </label>
                    <textarea
                      id="schedule-description"
                      rows="4"
                      placeholder="장소나 준비물 같은 정보를 적어주세요."
                      value={formValues.description}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    ></textarea>

                    {formMode === "create" ? (
                      <div className="schedule-repeat-card">
                        <label className="schedule-repeat-toggle" htmlFor="schedule-repeat-monthly">
                          <input
                            id="schedule-repeat-monthly"
                            type="checkbox"
                            checked={repeatMode === "monthly"}
                            onChange={(event) => handleRepeatToggle(event.target.checked)}
                          />
                          <span>
                            <strong>선택한 요일로 한 달치 반복 일정 만들기</strong>
                            <small>
                              같은 제목과 시간으로 {repeatMonthLabel || "해당 월"} 일정을
                              한 번에 등록합니다.
                            </small>
                          </span>
                        </label>

                        {repeatMode === "monthly" ? (
                          <>
                            <div className="schedule-repeat-weekdays">
                              {weekdayLabels.map((label, index) => {
                                const isChecked = repeatWeekdays.includes(index);

                                return (
                                  <label
                                    key={label}
                                    className={`schedule-repeat-day${
                                      isChecked ? " is-selected" : ""
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleRepeatWeekdayChange(index)}
                                    />
                                    <span>{label}요일</span>
                                  </label>
                                );
                              })}
                            </div>

                            <p className="schedule-repeat-summary">
                              {repeatDates.length
                                ? `${repeatMonthLabel}에 ${repeatWeekdayText} 일정 ${repeatDates.length}개가 생성됩니다.`
                                : "반복 등록할 요일을 선택해주세요."}
                            </p>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="schedule-form-actions">
                      <button
                        type="submit"
                        className="btn btn-dark"
                        disabled={isSubmitting || !!error}
                      >
                        {isSubmitting
                          ? "저장 중..."
                          : formMode === "edit"
                            ? "일정 수정"
                            : "일정 등록"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => resetForm()}
                        disabled={isSubmitting}
                      >
                        새 일정 작성
                      </button>
                    </div>

                    {formStatus ? (
                      <p className={`guestbook-status is-${formStatus.type}`}>
                        {formStatus.text}
                      </p>
                    ) : null}
                  </form>
                </div>
              
              </div>
            ) : null}
          </div>
        </div>
        <ConfirmDialog
          open={isRepeatConfirmOpen}
          title="반복 일정 등록"
          message={`${repeatMonthLabel}에 ${repeatWeekdayText} 일정 ${repeatDates.length}개를 한 번에 등록할까요?`}
          confirmLabel="등록"
          isSubmitting={isSubmitting}
          onConfirm={saveMonthlyRepeatEntries}
          onClose={() => {
            if (!isSubmitting) {
              setIsRepeatConfirmOpen(false);
            }
          }}
        />
        <ConfirmDialog
          open={!!entryToDelete}
          title="일정 삭제"
          message={
            entryToDelete ? `"${entryToDelete.title}" 일정을 삭제할까요?` : ""
          }
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

export default Schedule;

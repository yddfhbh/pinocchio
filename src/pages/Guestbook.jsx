import { useState } from "react";
import useGuestbookEntries from "../hooks/useGuestbookEntries";
import {
  deleteGuestbookEntry,
  formatGuestbookDate,
  GUESTBOOK_ENTRY_LIMIT,
  GUESTBOOK_MESSAGE_LIMIT,
  GUESTBOOK_NICKNAME_LIMIT,
  getGuestbookDisplayName,
  postGuestbookEntry,
} from "../lib/guestbook";

function Guestbook({ isAdmin }) {
  const { entries, error, isLoading, setEntries } =
    useGuestbookEntries(GUESTBOOK_ENTRY_LIMIT);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const remainingCount = GUESTBOOK_MESSAGE_LIMIT - message.length;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setStatus({
        type: "error",
        text: "메시지를 입력한 뒤 등록해주세요.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const entry = await postGuestbookEntry({
        nickname,
        message: trimmedMessage,
      });

      setEntries((currentEntries) =>
        [entry, ...currentEntries].slice(0, GUESTBOOK_ENTRY_LIMIT)
      );
      setNickname("");
      setMessage("");
      setStatus({
        type: "success",
        text: "방명록이 등록되었습니다.",
      });
    } catch (submitError) {
      setStatus({
        type: "error",
        text:
          submitError instanceof Error
            ? submitError.message
            : "방명록을 등록하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm("이 방명록 메시지를 삭제할까요?")) {
      return;
    }

    setDeletingId(entry.id);
    setStatus(null);

    try {
      await deleteGuestbookEntry(entry.id);
      setEntries((currentEntries) =>
        currentEntries.filter((currentEntry) => currentEntry.id !== entry.id)
      );
      setStatus({
        type: "success",
        text: "방명록이 삭제되었습니다.",
      });
    } catch (deleteError) {
      setStatus({
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "방명록을 삭제하지 못했습니다.",
      });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section className="page-section">
      <div className="container">
        <h2>방명록</h2>
        <p className="page-description">
          공연을 본 감상이나 응원의 메시지를 자유롭게 남겨주세요.
          닉네임을 비워두면 익명으로 등록됩니다.
        </p>

        {error ? (
          <div className="guestbook-server-note">
            서버 연결이 아직 준비되지 않아 예시 메시지를 보여주고 있습니다.
          </div>
        ) : null}

        <form className="guestbook-form" onSubmit={handleSubmit}>
          <label className="guestbook-label" htmlFor="guestbook-nickname">
            닉네임
          </label>
          <input
            id="guestbook-nickname"
            type="text"
            placeholder="10자 이내, 비워두면 익명"
            value={nickname}
            maxLength={GUESTBOOK_NICKNAME_LIMIT}
            onChange={(event) => {
              setNickname(event.target.value);

              if (status) {
                setStatus(null);
              }
            }}
          />
          <p className="guestbook-form-hint guestbook-nickname-hint">
            최대 {GUESTBOOK_NICKNAME_LIMIT}자까지 입력할 수 있어요.
          </p>

          <label className="guestbook-label" htmlFor="guestbook-message">
            응원 메시지
          </label>
          <textarea
            id="guestbook-message"
            placeholder="응원 한마디를 남겨주세요."
            rows="5"
            value={message}
            maxLength={GUESTBOOK_MESSAGE_LIMIT}
            onChange={(event) => {
              setMessage(event.target.value);

              if (status) {
                setStatus(null);
              }
            }}
          ></textarea>

          <div className="guestbook-form-footer">
            <p
              className={`guestbook-form-hint${
                remainingCount <= 20 ? " is-tight" : ""
              }`}
            >
              {remainingCount}자 남았어요.
            </p>
            <button
              type="submit"
              className="btn btn-dark"
              disabled={!message.trim() || isSubmitting || !!error}
            >
              {isSubmitting ? "등록 중..." : "등록하기"}
            </button>
          </div>

          {status ? (
            <p className={`guestbook-status is-${status.type}`}>{status.text}</p>
          ) : null}
        </form>

        <div className="guestbook-list-head">
          <h3>남겨진 메시지</h3>
          <span>{entries.length}개</span>
        </div>

        {isLoading ? (
          <div className="guestbook-empty">방명록을 불러오는 중입니다.</div>
        ) : (
          <div className="guestbook-list">
            {entries.length ? (
              entries.map((entry) => (
                <article className="guestbook-item" key={entry.id}>
                  <div className="guestbook-item-head">
                    <div className="guestbook-item-meta">
                      <strong>{getGuestbookDisplayName(entry.nickname)}</strong>
                      <span>{formatGuestbookDate(entry.createdAt)}</span>
                    </div>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn btn-light guestbook-delete-button"
                        onClick={() => handleDelete(entry)}
                        disabled={!!error || deletingId === entry.id}
                      >
                        {deletingId === entry.id ? "삭제 중..." : "삭제"}
                      </button>
                    ) : null}
                  </div>
                  <p>{entry.message}</p>
                </article>
              ))
            ) : (
              <div className="guestbook-empty">
                아직 등록된 메시지가 없어요. 첫 번째 응원을 남겨보세요.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Guestbook;

<script>
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { adminSession } from "$lib/state/admin-session.svelte.js";
  import { createGuestbookEntriesState } from "$lib/state/guestbook-entries.svelte.js";
  import {
    deleteGuestbookEntry,
    formatGuestbookDate,
    GUESTBOOK_ENTRY_LIMIT,
    GUESTBOOK_MESSAGE_LIMIT,
    GUESTBOOK_NICKNAME_LIMIT,
    getGuestbookDisplayName,
    postGuestbookEntry,
  } from "$lib/guestbook";

  const { guestbook, reload } = createGuestbookEntriesState(GUESTBOOK_ENTRY_LIMIT);
  const admin = adminSession.state;

  let nickname = $state("");
  let message = $state("");
  let status = $state(null);
  let isSubmitting = $state(false);
  let deletingId = $state("");
  let entryToDelete = $state(null);

  const remainingCount = $derived(GUESTBOOK_MESSAGE_LIMIT - message.length);

  $effect(() => {
    void reload();
  });

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      status = {
        type: "error",
        text: "메시지를 입력한 뒤 등록해주세요.",
      };
      return;
    }

    isSubmitting = true;

    try {
      const entry = await postGuestbookEntry({
        nickname,
        message: trimmedMessage,
      });

      guestbook.entries = [entry, ...guestbook.entries].slice(0, GUESTBOOK_ENTRY_LIMIT);
      nickname = "";
      message = "";
      status = {
        type: "success",
        text: "방명록이 등록되었습니다.",
      };
    } catch (submitError) {
      status = {
        type: "error",
        text:
          submitError instanceof Error
            ? submitError.message
            : "방명록을 등록하지 못했습니다.",
      };
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    if (!entryToDelete) {
      return;
    }

    deletingId = entryToDelete.id;
    status = null;

    try {
      await deleteGuestbookEntry(entryToDelete.id);
      guestbook.entries = guestbook.entries.filter(
        (currentEntry) => currentEntry.id !== entryToDelete.id
      );
      status = {
        type: "success",
        text: "방명록이 삭제되었습니다.",
      };
    } catch (deleteError) {
      status = {
        type: "error",
        text:
          deleteError instanceof Error
            ? deleteError.message
            : "방명록을 삭제하지 못했습니다.",
      };
    } finally {
      deletingId = "";
      entryToDelete = null;
    }
  }
</script>

<section class="page-section">
  <div class="container">
    <h2>방명록</h2>
    <p class="page-description">
      공연을 본 감상이나 응원의 메시지를 자유롭게 남겨주세요.
      닉네임을 비워두면 익명으로 등록됩니다.
    </p>

    {#if guestbook.error}
      <div class="guestbook-server-note">
        서버 연결이 아직 준비되지 않아 예시 메시지를 보여주고 있습니다.
      </div>
    {/if}

    <form class="guestbook-form" onsubmit={handleSubmit}>
      <label class="guestbook-label" for="guestbook-nickname">
        닉네임
      </label>
      <input
        id="guestbook-nickname"
        type="text"
        placeholder="10자 이내, 비워두면 익명"
        maxlength={GUESTBOOK_NICKNAME_LIMIT}
        bind:value={nickname}
        oninput={() => {
          if (status) {
            status = null;
          }
        }}
      />
      <p class="guestbook-form-hint guestbook-nickname-hint">
        최대 {GUESTBOOK_NICKNAME_LIMIT}자까지 입력할 수 있어요.
      </p>

      <label class="guestbook-label" for="guestbook-message">
        응원 메시지
      </label>
      <textarea
        id="guestbook-message"
        placeholder="응원 한마디를 남겨주세요."
        rows="5"
        maxlength={GUESTBOOK_MESSAGE_LIMIT}
        bind:value={message}
        oninput={() => {
          if (status) {
            status = null;
          }
        }}
      ></textarea>

      <div class="guestbook-form-footer">
        <p class={`guestbook-form-hint${remainingCount <= 20 ? " is-tight" : ""}`}>
          {remainingCount}자 남았어요.
        </p>
        <button
          type="submit"
          class="btn btn-dark"
          disabled={!message.trim() || isSubmitting || !!guestbook.error}
        >
          {isSubmitting ? "등록 중..." : "등록하기"}
        </button>
      </div>

      {#if status}
        <p class={`guestbook-status is-${status.type}`}>{status.text}</p>
      {/if}
    </form>

    <div class="guestbook-list-head">
      <h3>남겨진 메시지</h3>
      <span>{guestbook.entries.length}개</span>
    </div>

    {#if guestbook.isLoading}
      <div class="guestbook-empty">방명록을 불러오는 중입니다.</div>
    {:else}
      <div class="guestbook-list">
        {#if guestbook.entries.length}
          {#each guestbook.entries as entry (entry.id)}
            <article class="guestbook-item">
              <div class="guestbook-item-head">
                <div class="guestbook-item-meta">
                  <strong>{getGuestbookDisplayName(entry.nickname)}</strong>
                  <span>{formatGuestbookDate(entry.createdAt)}</span>
                </div>
                {#if admin.isAdmin}
                  <button
                    type="button"
                    class="btn btn-light guestbook-delete-button"
                    onclick={() => {
                      entryToDelete = entry;
                    }}
                    disabled={!!guestbook.error || deletingId === entry.id}
                  >
                    {deletingId === entry.id ? "삭제 중..." : "삭제"}
                  </button>
                {/if}
              </div>
              <p>{entry.message}</p>
            </article>
          {/each}
        {:else}
          <div class="guestbook-empty">
            아직 등록된 메시지가 없어요. 첫 번째 응원을 남겨보세요.
          </div>
        {/if}
      </div>
    {/if}

    <ConfirmDialog
      open={!!entryToDelete}
      title="방명록 삭제"
      message="이 방명록 메시지를 삭제할까요?"
      confirmLabel="삭제"
      tone="danger"
      isSubmitting={!!deletingId}
      onConfirm={handleDelete}
      onClose={() => {
        if (!deletingId) {
          entryToDelete = null;
        }
      }}
    />
  </div>
</section>

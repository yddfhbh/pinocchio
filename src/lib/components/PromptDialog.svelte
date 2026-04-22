<script>
  import DialogFrame from "$lib/components/DialogFrame.svelte";

  let {
    open,
    title,
    message,
    value,
    placeholder,
    errorText,
    confirmLabel = "확인",
    cancelLabel = "취소",
    isSubmitting = false,
    onChange,
    onConfirm,
    onClose,
  } = $props();
</script>

<DialogFrame
  {open}
  {title}
  {message}
  onClose={isSubmitting ? undefined : onClose}
>
  <input
    class="dialog-input"
    type="password"
    {placeholder}
    {value}
    disabled={isSubmitting}
    oninput={(event) => onChange(event.currentTarget.value)}
  />

  {#if errorText}
    <p class="guestbook-status is-error dialog-error">{errorText}</p>
  {/if}

  {#snippet actions()}
    <button
      type="button"
      class="btn btn-light dialog-button"
      onclick={onClose}
      disabled={isSubmitting}
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      class="btn btn-dark dialog-button"
      onclick={onConfirm}
      disabled={isSubmitting}
    >
      {isSubmitting ? "처리 중..." : confirmLabel}
    </button>
  {/snippet}
</DialogFrame>

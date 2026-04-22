<script>
  import DialogFrame from "$lib/components/DialogFrame.svelte";

  let {
    open,
    title,
    message,
    confirmLabel = "확인",
    cancelLabel = "취소",
    tone = "default",
    isSubmitting = false,
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
      class={`btn dialog-button ${tone === "danger" ? "btn-dark" : "btn-dark"}`}
      onclick={onConfirm}
      disabled={isSubmitting}
    >
      {isSubmitting ? "처리 중..." : confirmLabel}
    </button>
  {/snippet}
</DialogFrame>

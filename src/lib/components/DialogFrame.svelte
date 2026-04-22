<script>
  let {
    open,
    title,
    message = "",
    children,
    actions,
    onClose,
    className = "",
    closeOnBackdrop = true,
  } = $props();
</script>

{#if open}
  <div
    class="dialog-backdrop"
    role="presentation"
    onclick={closeOnBackdrop ? onClose : undefined}
  >
    <div
      class={`dialog-card${className ? ` ${className}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => {
        if (event.key === "Escape" && onClose) {
          onClose();
        }
      }}
    >
      <div class="dialog-head">
        <h3>{title}</h3>
        <button type="button" class="dialog-close" onclick={onClose} aria-label="닫기">
          닫기
        </button>
      </div>
      {#if message}
        <p class="dialog-message">{message}</p>
      {/if}
      {#if children}
        {@render children()}
      {/if}
      {#if actions}
        <div class="dialog-actions">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}

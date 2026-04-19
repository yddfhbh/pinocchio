export function DialogFrame({
  open,
  title,
  message,
  children,
  actions,
  onClose,
  className = "",
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`dialog-card${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <h3>{title}</h3>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="닫기">
            닫기
          </button>
        </div>
        {message ? <p className="dialog-message">{message}</p> : null}
        {children}
        {actions ? <div className="dialog-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "default",
  isSubmitting = false,
  onConfirm,
  onClose,
}) {
  return (
    <DialogFrame
      open={open}
      title={title}
      message={message}
      onClose={isSubmitting ? undefined : onClose}
      actions={
        <>
          <button
            type="button"
            className="btn btn-light dialog-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn dialog-button ${tone === "danger" ? "btn-dark" : "btn-dark"}`}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : confirmLabel}
          </button>
        </>
      }
    />
  );
}

export function PromptDialog({
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
}) {
  return (
    <DialogFrame
      open={open}
      title={title}
      message={message}
      onClose={isSubmitting ? undefined : onClose}
      actions={
        <>
          <button
            type="button"
            className="btn btn-light dialog-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-dark dialog-button"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : confirmLabel}
          </button>
        </>
      }
    >
      <input
        className="dialog-input"
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isSubmitting}
      />
      {errorText ? <p className="guestbook-status is-error dialog-error">{errorText}</p> : null}
    </DialogFrame>
  );
}

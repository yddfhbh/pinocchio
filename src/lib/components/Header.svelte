<script>
  import PromptDialog from "$lib/components/PromptDialog.svelte";

  let {
    isAdmin,
    isConfigured,
    isLoading,
    isSubmitting,
    onLogin,
    onLogout,
  } = $props();

  let status = $state(null);
  let isLoginDialogOpen = $state(false);
  let adminCode = $state("");
  let adminCodeError = $state("");

  const adminButtonLabel = $derived(
    isLoading ? "확인 중" : isSubmitting ? "처리 중" : isAdmin ? "로그아웃" : "관리자"
  );

  async function handleAdminAction() {
    status = null;

    if (isAdmin) {
      try {
        await onLogout();
        status = null;
      } catch (error) {
        status = {
          type: "error",
          text: error instanceof Error ? error.message : "로그아웃에 실패했습니다.",
        };
      }

      return;
    }

    if (!isConfigured) {
      status = {
        type: "error",
        text: "관리자 로그인이 아직 설정되지 않았습니다. ADMIN_CODE 또는 ADMIN_SESSION_SECRET을 확인해 주세요.",
      };
      return;
    }

    adminCode = "";
    adminCodeError = "";
    isLoginDialogOpen = true;
  }

  async function handleLoginConfirm() {
    if (!adminCode.trim()) {
      adminCodeError = "관리자 코드를 입력해주세요.";
      return;
    }

    try {
      await onLogin(adminCode.trim());
      isLoginDialogOpen = false;
      adminCode = "";
      adminCodeError = "";
      status = null;
    } catch (error) {
      adminCodeError =
        error instanceof Error ? error.message : "관리자 로그인에 실패했습니다.";
    }
  }

  function handleDialogClose() {
    if (isSubmitting) {
      return;
    }

    isLoginDialogOpen = false;
    adminCode = "";
    adminCodeError = "";
  }
</script>

<header class="header">
  <div class="container header-inner">
    <div class="brand-lockup">
      <a href="/" class="logo">PINOCCHIO</a>
      <span class="logo-caption">PUSAN NATIONAL UNIVERSITY PAN FLUTE CLUB</span>
    </div>

    <nav class="nav">
      <a href="/">홈</a>
      <a href="/about">동아리 소개</a>
      <a href="/scores">악보실</a>
      <a href="/videos">공연 영상</a>
      <a href="/schedule">일정</a>
      <span class="nav-admin-group">
        <a href="/guestbook">방명록</a>
        <button
          type="button"
          class={`nav-admin-button${isAdmin ? " is-active" : ""}`}
          onclick={handleAdminAction}
          disabled={isLoading || isSubmitting}
        >
          {adminButtonLabel}
        </button>
      </span>
    </nav>
  </div>

  {#if status}
    <div class="container">
      <p class={`guestbook-status header-status is-${status.type}`}>{status.text}</p>
    </div>
  {/if}

  <PromptDialog
    open={isLoginDialogOpen}
    title="관리자 로그인"
    message="관리자 코드를 입력하면 관리 모드로 전환됩니다."
    value={adminCode}
    placeholder="관리자 코드"
    errorText={adminCodeError}
    confirmLabel="로그인"
    {isSubmitting}
    onChange={(value) => {
      adminCode = value;

      if (adminCodeError) {
        adminCodeError = "";
      }
    }}
    onConfirm={handleLoginConfirm}
    onClose={handleDialogClose}
  />
</header>

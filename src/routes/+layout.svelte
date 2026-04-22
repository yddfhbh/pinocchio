<script>
  import "../index.css";
  import "../App.css";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { adminSession } from "$lib/state/admin-session.svelte.js";

  let { children } = $props();

  const admin = adminSession.state;

  $effect(() => {
    void adminSession.load();
  });
</script>

<div class="site-wrapper">
  <Header
    isAdmin={admin.isAdmin}
    isConfigured={admin.isConfigured}
    isLoading={admin.isLoading}
    isSubmitting={admin.isSubmitting}
    onLogin={adminSession.login}
    onLogout={adminSession.logout}
  />
  <main class="main-content">
    {@render children()}
  </main>
  <Footer />
</div>

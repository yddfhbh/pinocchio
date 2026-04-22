import {
  fetchAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "$lib/adminSession";

function createAdminSession() {
  const state = $state({
    isAdmin: false,
    isConfigured: true,
    isLoading: true,
    isSubmitting: false,
    hasLoaded: false,
  });

  async function load(force = false) {
    if (state.hasLoaded && !force) {
      return;
    }

    state.isLoading = true;

    try {
      const result = await fetchAdminSession();
      state.isAdmin = result.isAdmin;
      state.isConfigured = result.isConfigured;
    } catch {
      state.isAdmin = false;
      state.isConfigured = false;
    } finally {
      state.isLoading = false;
      state.hasLoaded = true;
    }
  }

  async function login(code) {
    state.isSubmitting = true;

    try {
      await loginAdminSession(code);
      state.isAdmin = true;
      state.isConfigured = true;
    } finally {
      state.isSubmitting = false;
    }
  }

  async function logout() {
    state.isSubmitting = true;

    try {
      await logoutAdminSession();
      state.isAdmin = false;
    } finally {
      state.isSubmitting = false;
    }
  }

  return {
    state,
    load,
    login,
    logout,
  };
}

export const adminSession = createAdminSession();

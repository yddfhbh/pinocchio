import { useEffect, useState } from "react";
import {
  fetchAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "../lib/adminSession";

function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminSession() {
      setIsLoading(true);

      try {
        const result = await fetchAdminSession();

        if (!cancelled) {
          setIsAdmin(result.isAdmin);
          setIsConfigured(result.isConfigured);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setIsConfigured(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (code) => {
    setIsSubmitting(true);

    try {
      await loginAdminSession(code);
      setIsAdmin(true);
      setIsConfigured(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setIsSubmitting(true);

    try {
      await logoutAdminSession();
      setIsAdmin(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isAdmin,
    isConfigured,
    isLoading,
    isSubmitting,
    login,
    logout,
  };
}

export default useAdminSession;

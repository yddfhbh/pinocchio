import { useEffect, useState } from "react";
import {
  fetchAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "../lib/adminSession";

function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
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
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
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
    isLoading,
    isSubmitting,
    login,
    logout,
  };
}

export default useAdminSession;

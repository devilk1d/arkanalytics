'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'session_last_active';

export function SessionTimeout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkTimeout = useCallback(async () => {
    const lastActive = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    
    if (lastActive && now - parseInt(lastActive, 10) >= TIMEOUT_MS) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Mark offline before signing out
        await supabase
          .from('users')
          .update({ is_online: false, last_active_at: null })
          .eq('id', session.user.id);
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEY);
        router.push('/auth/signin?error=session_timeout');
      }
    } else {
      // Re-schedule check
      const nextCheckTime = lastActive ? parseInt(lastActive, 10) + TIMEOUT_MS - now : TIMEOUT_MS;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(checkTimeout, Math.max(1000, nextCheckTime));
    }
  }, [router]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    let isThrottled = false;
    const handleActivity = () => {
      if (!isThrottled) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, 2000); // Throttle activity updates to once per 2 seconds
      }
    };

    // Initialize
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    checkTimeout();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Listen to changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        checkTimeout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkTimeout]);

  return null;
}

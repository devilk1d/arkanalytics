'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Presence hook — keeps the current user's is_online + last_active_at in sync.
 *
 * Behaviour:
 *  - Tab visible   → is_online = true, heartbeat updates last_active_at every 30 s
 *  - Tab hidden    → heartbeat stops; is_online stays true so observers see AWAY
 *                    (staleness of last_active_at drives the ONLINE→AWAY transition)
 *  - Component unmount / logout → sets is_online = false (observers see OFFLINE)
 */
export function usePresence(userId: string | null | undefined) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const goOnline = async () => {
      const { error } = await supabase
        .from('users')
        .update({ is_online: true, last_active_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.warn('[usePresence] goOnline failed:', error.message);
      }
    };

    const goOffline = async () => {
      await supabase
        .from('users')
        .update({ is_online: false })
        .eq('id', userId);
    };

    const startHeartbeat = () => {
      void goOnline();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => void goOnline(), 30_000);
    };

    const stopHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startHeartbeat();
      } else {
        // Stop heartbeat but do NOT call goOffline() here.
        // Leaving is_online=true lets observers distinguish AWAY (tab hidden,
        // heartbeat stale) from OFFLINE (explicit logout sets is_online=false).
        stopHeartbeat();
      }
    };

    // Also handle window focus/blur as a secondary trigger so that
    // switching back to the tab after it was backgrounded immediately
    // marks the user online without waiting for visibilitychange.
    const handleFocus = () => {
      if (document.visibilityState === 'visible') startHeartbeat();
    };

    if (document.visibilityState === 'visible') {
      startHeartbeat();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      void goOffline();
    };
  }, [userId]);
}

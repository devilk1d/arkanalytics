'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Presence hook — keeps the current user's is_online + last_active_at in sync.
 *
 * Behaviour:
 *  - Tab visible   → is_online = true, heartbeat updates last_active_at every 30 s
 *  - Tab hidden    → is_online = false (heartbeat paused → status becomes AWAY)
 *  - Component unmount / logout handled externally via setOffline export
 */
export function usePresence(userId: string | null | undefined) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef(userId);

  // Keep ref in sync so callbacks always see the latest value without re-subscribing
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const goOnline = async () => {
      await supabase
        .from('users')
        .update({ is_online: true, last_active_at: new Date().toISOString() })
        .eq('id', userId);
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
        stopHeartbeat();
        void goOffline();
      }
    };

    // Start immediately if tab is already visible
    if (document.visibilityState === 'visible') {
      startHeartbeat();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void goOffline();
    };
  }, [userId]);
}

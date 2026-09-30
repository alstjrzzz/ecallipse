import {useEffect, useMemo, useState} from 'react';
import {callApi} from '../api';
import type {Contact} from '../domain';

/** Online means the user has the app open. Polled because presence only changes how a call is delivered, not whether it can start. */
export function useContactPresence(contacts: Contact[]) {
  const userIds = useMemo(() => contacts.flatMap((contact) => contact.app ? [contact.app.userId] : []).sort().join(','), [contacts]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userIds) return;
    let disposed = false;
    const poll = () => callApi.presence(userIds.split(','))
      .then((result) => { if (!disposed) setPresence(result); })
      .catch(() => undefined);
    void poll();
    const timer = window.setInterval(poll, 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [userIds]);

  return presence;
}

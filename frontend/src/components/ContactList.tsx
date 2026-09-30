import {useState} from 'react';
import {useContactPresence} from '../calls/useContactPresence';
import {useStartCall, type StartCallOptions} from '../calls/useStartCall';
import type {Contact} from '../domain';
import {ContactCard} from './ContactCard';
import {PreCallSheet} from './PreCallSheet';

/** Contact grid whose Start call opens the pre-call sheet instead of dialing immediately. */
export function ContactList({contacts, large = false}: {contacts: Contact[]; large?: boolean}) {
  const {startCall, startingId, error, clearError} = useStartCall();
  const presence = useContactPresence(contacts);
  const [target, setTarget] = useState<Contact | null>(null);

  const close = () => {
    setTarget(null);
    clearError();
  };

  const start = (options: StartCallOptions) => {
    if (target) void startCall(target, options);
  };

  return (
    <>
      <div className={`contact-grid${large ? ' large' : ''}`}>
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            online={contact.app ? presence[contact.app.userId] : undefined}
            onCall={setTarget}
            busy={startingId === contact.id}
          />
        ))}
      </div>
      {target && (
        <PreCallSheet
          contact={target}
          online={target.app ? presence[target.app.userId] : undefined}
          starting={startingId === target.id}
          error={error}
          onClose={close}
          onStart={start}
        />
      )}
    </>
  );
}

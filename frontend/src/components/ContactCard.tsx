import type {Contact} from '../domain';
import {Avatar} from './Avatar';

type ContactCardProps = {
  contact: Contact;
  /** Undefined until presence is known. Only meaningful for contacts reachable through the app. */
  online?: boolean;
  onCall: (contact: Contact) => void;
  busy?: boolean;
};

export function ContactCard({contact, online, onCall, busy}: ContactCardProps) {
  return (
    <article className="contact-card">
      <div className="contact-head">
        <Avatar person={contact} />
        <span className="presence-group">
          {contact.app && <span className={`presence ${online ? 'presence-available' : 'presence-offline'}`}>{online === undefined ? 'app' : online ? 'app · online' : 'app · offline'}</span>}
          {contact.phoneNumber && <span className="presence presence-phone">phone</span>}
        </span>
      </div>
      <h3>{contact.name}</h3>
      <p>{contact.role}</p>
      <div className="contact-meta"><span>{contact.phoneNumber && !contact.app ? 'Number' : 'Last contact'}</span><strong>{contact.phoneNumber && !contact.app ? contact.phoneNumber : contact.lastContact}</strong></div>
      <button type="button" className="contact-call" onClick={() => onCall(contact)} disabled={busy}>
        <span>⌕</span>{busy ? 'Connecting…' : 'Start call'}
      </button>
    </article>
  );
}

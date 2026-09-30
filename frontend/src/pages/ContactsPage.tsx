import {useMemo, useState} from 'react';
import {useAuth} from '../auth/AuthContext';
import {ContactList} from '../components/ContactList';
import {CONTACTS} from '../data';

export function ContactsPage() {
  const {user} = useAuth();
  const [query, setQuery] = useState('');
  const contacts = useMemo(() => CONTACTS.filter((contact) => contact.app?.userId !== user?.id)
    .filter((contact) => `${contact.name} ${contact.role}`.toLowerCase().includes(query.toLowerCase())), [query, user]);

  return (
    <div className="contacts-page">
      <header className="page-header compact"><div><span className="eyebrow">CONTACTS</span><h1>Start with a person.</h1><p>앱 사용자에게는 앱으로, 전화번호가 있으면 전화망으로 걸 수 있다. 통화 구성은 발신 전에 고른다.</p></div></header>
      <div className="contact-toolbar">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts" /></label>
        <button type="button" disabled>＋ Add contact <small>soon</small></button>
      </div>
      <ContactList contacts={contacts} large />
    </div>
  );
}

import {CONTACTS, USERS} from '../data';
import type {CallDestination, CallSession, Contact} from '../domain';

export type Party = Pick<Contact, 'name' | 'role' | 'initials' | 'accent'> & {
  label: string;
  app?: Contact['app'];
  phoneNumber?: string;
};

/** The other side of a call, from the point of view of `userId`. */
export function counterpartOf(call: CallSession, userId: string): CallDestination {
  return call.callerId === userId ? call.destination : {type: 'INTERNAL_USER', address: call.callerId};
}

export function resolveParty(destination: CallDestination): Party {
  const contact = destination.type === 'INTERNAL_USER'
    ? CONTACTS.find((item) => item.app?.userId === destination.address)
    : CONTACTS.find((item) => item.phoneNumber === destination.address);
  if (contact) return {...contact, label: contact.name};

  const user = destination.type === 'INTERNAL_USER' ? USERS[destination.address] : undefined;
  if (user) return {...user, app: {userId: user.id, sipExtension: user.sipExtension}, label: user.name};

  return {
    name: destination.address,
    role: destination.type === 'INTERNAL_USER' ? 'Internal call' : 'Phone call',
    initials: destination.address.replace(/\W/g, '').slice(0, 2).toUpperCase() || '?',
    accent: '#8b7cf6',
    label: destination.address,
    phoneNumber: destination.type === 'EXTERNAL_PHONE' ? destination.address : undefined,
  };
}

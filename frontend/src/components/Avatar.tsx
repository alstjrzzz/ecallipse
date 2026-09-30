import type {CSSProperties} from 'react';
import type {UserProfile} from '../domain';

export function Avatar({person, size = 'medium'}: {person: Pick<UserProfile, 'name' | 'initials' | 'accent'>; size?: 'small' | 'medium' | 'large'}) {
  return (
    <span className={`avatar avatar-${size}`} style={{'--avatar-accent': person.accent} as CSSProperties} title={person.name}>
      {person.initials}
    </span>
  );
}

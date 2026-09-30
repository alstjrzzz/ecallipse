import {Link} from 'react-router-dom';

export function Brand({compact = false}: {compact?: boolean}) {
  return (
    <Link to="/" className="brand" aria-label="Ecallipse home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      {!compact && <span>Ecallipse</span>}
    </Link>
  );
}

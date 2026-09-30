import {useState, type FormEvent} from 'react';
import {Link, Navigate, useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import {Brand} from '../components/Brand';
import {USERS} from '../data';

export function AuthPage({mode}: {mode: 'login' | 'signup'}) {
  const {user, signIn} = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('alice');
  if (user) return <Navigate to="/app" replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn(selected);
    navigate('/app');
  };

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div><span className="eyebrow">A CALMER WAY TO CALL</span><h1>Keep the conversation. Lose the busywork.</h1><p>Use two browser windows with Alice and Bob to try the current internal-call POC.</p></div>
        <small>ECALLIPSE · WALKING SKELETON</small>
      </section>
      <section className="auth-panel">
        <form onSubmit={submit}>
          <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR SPACE'}</span>
          <h2>{mode === 'login' ? 'Sign in to Ecallipse' : 'Start with a demo account'}</h2>
          <p>인증은 현재 POC용 더미 계정이다. 두 창에서 서로 다른 사용자를 선택할 수 있다.</p>
          <div className="account-picker">
            {Object.values(USERS).map((account) => (
              <label className={selected === account.id ? 'selected' : ''} key={account.id}>
                <input type="radio" name="account" value={account.id} checked={selected === account.id} onChange={() => setSelected(account.id)} />
                <span style={{background: account.accent}}>{account.initials}</span>
                <b>{account.name}<small>SIP {account.sipExtension}</small></b>
                <i>✓</i>
              </label>
            ))}
          </div>
          <button className="button button-primary button-wide" type="submit">Continue to workspace</button>
          <small className="auth-switch">{mode === 'login' ? 'New to Ecallipse?' : 'Already have an account?'} <Link to={mode === 'login' ? '/signup' : '/login'}>{mode === 'login' ? 'Create account' : 'Sign in'}</Link></small>
        </form>
      </section>
    </div>
  );
}

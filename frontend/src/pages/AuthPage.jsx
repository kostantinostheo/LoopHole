import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import FormField from '../components/form/FormField';
import { useAuth } from '../context/AuthContext';

const TEXT = {
  login: {
    tagline: 'Welcome back',
    heading: 'Log in',
    submit: 'Log in',
    submitting: 'Logging in…',
    switchPrompt: "Don't have an account?",
    switchTo: { path: '/register', label: 'Register' },
  },
  register: {
    tagline: 'Track every subscription. Never miss a renewal.',
    heading: 'Create an account',
    submit: 'Register',
    submitting: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchTo: { path: '/login', label: 'Log in' },
  },
};

// mode: 'login' | 'register'
export default function AuthPage({ mode }) {
  const text = TEXT[mode];
  const isRegister = mode === 'register';
  const auth = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isRegister && password !== confirmPassword) return setError('Passwords do not match');
    if (isRegister && password.length < 6) return setError('Password must be at least 6 characters');

    setError(null);
    setSubmitting(true);
    try {
      await auth[mode](email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <BrandLogo tagline={text.tagline} />

        <form className="subs-form auth-form" onSubmit={handleSubmit}>
          <h1 className="subs-form__heading">{text.heading}</h1>

          <FormField label="Email" type="email" value={email} onChange={setEmail} autoFocus required />
          <FormField label="Password" type="password" value={password} onChange={setPassword} required />
          {isRegister && (
            <FormField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />
          )}

          {error && <p className="auth-form__error">{error}</p>}

          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? text.submitting : text.submit}
          </button>

          <p className="auth-form__switch">
            {text.switchPrompt} <Link to={text.switchTo.path}>{text.switchTo.label}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

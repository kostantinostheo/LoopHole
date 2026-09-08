import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { CURRENCIES } from '../lib/currency';

const EMPTY_VAULT = {
  emailjsPublicKey: '',
  emailjsPrivateKey: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  telegramBotToken: '',
  telegramChatId: '',
};

export default function SettingsPage() {
  const { user, updateEmail, updatePassword, updateCurrency } = useAuth();

  const [email, setEmail] = useState(user?.email || '');
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [currencyStatus, setCurrencyStatus] = useState(null);
  const [currencySubmitting, setCurrencySubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [vault, setVault] = useState(EMPTY_VAULT);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultStatus, setVaultStatus] = useState(null);
  const [vaultSubmitting, setVaultSubmitting] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [testTelegramStatus, setTestTelegramStatus] = useState(null);

  useEffect(() => {
    apiFetch('/api/vault')
      .then((data) => setVault({ ...EMPTY_VAULT, ...data }))
      .catch((err) => setVaultStatus({ type: 'error', message: err.message }))
      .finally(() => setVaultLoading(false));
  }, []);

  function updateVaultField(key, value) {
    setVault((prev) => ({ ...prev, [key]: value }));
  }

  async function handleVaultSubmit(e) {
    e.preventDefault();
    setVaultStatus(null);
    setVaultSubmitting(true);
    try {
      const saved = await apiFetch('/api/vault', { method: 'PUT', body: JSON.stringify(vault) });
      setVault({ ...EMPTY_VAULT, ...saved });
      setVaultStatus({ type: 'success', message: 'Integrations saved.' });
    } catch (err) {
      setVaultStatus({ type: 'error', message: err.message });
    } finally {
      setVaultSubmitting(false);
    }
  }

  async function handleSendTestEmail() {
    setTestEmailStatus('sending');
    try {
      const data = await apiFetch('/api/test-email', { method: 'POST' });
      setTestEmailStatus(`Sent to ${data.email}`);
    } catch (err) {
      setTestEmailStatus(`Error: ${err.message}`);
    }
  }

  async function handleSendTestTelegram() {
    setTestTelegramStatus('sending');
    try {
      await apiFetch('/api/test-telegram', { method: 'POST' });
      setTestTelegramStatus('Sent');
    } catch (err) {
      setTestTelegramStatus(`Error: ${err.message}`);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailStatus(null);
    setEmailSubmitting(true);
    try {
      await updateEmail(email);
      setEmailStatus({ type: 'success', message: 'Email updated.' });
    } catch (err) {
      setEmailStatus({ type: 'error', message: err.message });
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleCurrencySubmit(e) {
    e.preventDefault();
    setCurrencyStatus(null);
    setCurrencySubmitting(true);
    try {
      await updateCurrency(currency);
      setCurrencyStatus({ type: 'success', message: 'Currency updated.' });
    } catch (err) {
      setCurrencyStatus({ type: 'error', message: err.message });
    } finally {
      setCurrencySubmitting(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordStatus({ type: 'success', message: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="subs-dashboard">
      <header className="subs-dashboard__header">
        <div>
          <h1>Settings</h1>
        </div>
        <Link to="/" className="link">
          Back to dashboard
        </Link>
      </header>

      <form className="subs-form" onSubmit={handleEmailSubmit}>
        <h2 className="subs-form__heading">Basic settings</h2>

        <label className="subs-form__field">
          <span className="subs-form__label">Email</span>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {emailStatus && (
          <p className={emailStatus.type === 'error' ? 'auth-form__error' : 'auth-form__success'}>
            {emailStatus.message}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={emailSubmitting}>
          {emailSubmitting ? 'Saving…' : 'Save email'}
        </button>
      </form>

      <form className="subs-form" onSubmit={handleCurrencySubmit}>
        <h2 className="subs-form__heading">Currency</h2>

        <label className="subs-form__field">
          <span className="subs-form__label">Display currency</span>
          <select
            className="text-input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Object.entries(CURRENCIES).map(([code, { label }]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {currencyStatus && (
          <p
            className={currencyStatus.type === 'error' ? 'auth-form__error' : 'auth-form__success'}
          >
            {currencyStatus.message}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={currencySubmitting}>
          {currencySubmitting ? 'Saving…' : 'Save currency'}
        </button>
      </form>

      <form className="subs-form" onSubmit={handlePasswordSubmit}>
        <h2 className="subs-form__heading">Security</h2>

        <label className="subs-form__field">
          <span className="subs-form__label">Current password</span>
          <input
            className="text-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>

        <div className="subs-form__row">
          <label className="subs-form__field">
            <span className="subs-form__label">New password</span>
            <input
              className="text-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className="subs-form__field">
            <span className="subs-form__label">Confirm new password</span>
            <input
              className="text-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
        </div>

        {passwordStatus && (
          <p
            className={passwordStatus.type === 'error' ? 'auth-form__error' : 'auth-form__success'}
          >
            {passwordStatus.message}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={passwordSubmitting}>
          {passwordSubmitting ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <form className="subs-form" onSubmit={handleVaultSubmit}>
        <h2 className="subs-form__heading">Integrations</h2>
        <p className="subs-form__hint">
          Stored in an encrypted vault on this server, never in the regular database. Bring your
          own EmailJS account and Telegram bot — nothing here is shared with other users.
        </p>

        {vaultLoading ? (
          <p className="subs-dashboard__empty">Loading…</p>
        ) : (
          <>
            <span className="subs-form__label">EmailJS</span>
            <div className="subs-form__row">
              <label className="subs-form__field">
                <span className="subs-form__label">Public key</span>
                <input
                  className="text-input"
                  value={vault.emailjsPublicKey}
                  onChange={(e) => updateVaultField('emailjsPublicKey', e.target.value)}
                />
              </label>
              <label className="subs-form__field">
                <span className="subs-form__label">Private key</span>
                <input
                  className="text-input"
                  type="password"
                  value={vault.emailjsPrivateKey}
                  onChange={(e) => updateVaultField('emailjsPrivateKey', e.target.value)}
                />
              </label>
            </div>
            <div className="subs-form__row">
              <label className="subs-form__field">
                <span className="subs-form__label">Service ID</span>
                <input
                  className="text-input"
                  value={vault.emailjsServiceId}
                  onChange={(e) => updateVaultField('emailjsServiceId', e.target.value)}
                />
              </label>
              <label className="subs-form__field">
                <span className="subs-form__label">Template ID</span>
                <input
                  className="text-input"
                  value={vault.emailjsTemplateId}
                  onChange={(e) => updateVaultField('emailjsTemplateId', e.target.value)}
                />
              </label>
            </div>

            <span className="subs-form__label">Telegram</span>
            <div className="subs-form__row">
              <label className="subs-form__field">
                <span className="subs-form__label">Bot token</span>
                <input
                  className="text-input"
                  type="password"
                  value={vault.telegramBotToken}
                  onChange={(e) => updateVaultField('telegramBotToken', e.target.value)}
                />
              </label>
              <label className="subs-form__field">
                <span className="subs-form__label">Chat ID</span>
                <input
                  className="text-input"
                  value={vault.telegramChatId}
                  onChange={(e) => updateVaultField('telegramChatId', e.target.value)}
                />
              </label>
            </div>
            <p className="subs-form__hint">
              Message your bot on Telegram (search its username, press Start, send anything) and
              it will reply with the chat ID to paste above.
            </p>

            {vaultStatus && (
              <p
                className={vaultStatus.type === 'error' ? 'auth-form__error' : 'auth-form__success'}
              >
                {vaultStatus.message}
              </p>
            )}

            <button className="btn btn--primary" type="submit" disabled={vaultSubmitting}>
              {vaultSubmitting ? 'Saving…' : 'Save integrations'}
            </button>

            <div className="subs-test-email">
              <button
                type="button"
                className="link"
                onClick={handleSendTestEmail}
                disabled={testEmailStatus === 'sending'}
              >
                {testEmailStatus === 'sending' ? 'Sending test email…' : 'Send test email'}
              </button>
              {testEmailStatus && testEmailStatus !== 'sending' && (
                <span className="subs-test-email__status">{testEmailStatus}</span>
              )}
            </div>

            <div className="subs-test-email">
              <button
                type="button"
                className="link"
                onClick={handleSendTestTelegram}
                disabled={testTelegramStatus === 'sending'}
              >
                {testTelegramStatus === 'sending'
                  ? 'Sending test Telegram message…'
                  : 'Send test Telegram message'}
              </button>
              {testTelegramStatus && testTelegramStatus !== 'sending' && (
                <span className="subs-test-email__status">{testTelegramStatus}</span>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

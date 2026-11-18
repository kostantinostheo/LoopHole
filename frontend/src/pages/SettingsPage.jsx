import { useEffect, useState } from 'react';
import FormField from '../components/form/FormField';
import SelectInput from '../components/form/SelectInput';
import { ConfirmModal } from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/money';

const EMPTY_VAULT = { telegramBotToken: '', telegramChatId: '' };
const TIMEZONES = Intl.supportedValuesOf?.('timeZone') ?? [];
const CURRENCY_OPTIONS = Object.entries(CURRENCIES).map(([code, { label }]) => ({ value: code, label }));

/**
 * One settings card: validate -> confirm dialog -> save -> status line.
 * onSave resolves to the success message; validate returns an error message or nothing.
 */
function SettingsSection({
  title,
  hint,
  saveLabel,
  confirm,
  validate,
  onSave,
  initialStatus,
  footer,
  children,
}) {
  const [status, setStatus] = useState(initialStatus);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const error = validate?.();
    setStatus(error ? { type: 'error', message: error } : null);
    if (!error) setConfirming(true);
  }

  async function save() {
    setConfirming(false);
    setSaving(true);
    try {
      setStatus({ type: 'success', message: await onSave() });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="subs-form" onSubmit={handleSubmit}>
        <h2 className="subs-form__heading">{title}</h2>
        {hint && <p className="subs-form__hint">{hint}</p>}

        {children}

        {status && (
          <p className={status.type === 'error' ? 'auth-form__error' : 'auth-form__success'}>
            {status.message}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </button>
        {footer}
      </form>

      {confirming && (
        <ConfirmModal title={confirm.title} onConfirm={save} onCancel={() => setConfirming(false)}>
          {confirm.message}
        </ConfirmModal>
      )}
    </>
  );
}

function IntegrationsSection() {
  const [vault, setVault] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const setVaultField = (key) => (value) => setVault((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    api('/api/vault')
      .then((data) => setVault({ ...EMPTY_VAULT, ...data }))
      .catch((err) => {
        setVault(EMPTY_VAULT);
        setLoadError({ type: 'error', message: err.message });
      });
  }, []);

  async function sendTest() {
    setTestStatus('sending');
    try {
      await api('/api/test-telegram', 'POST');
      setTestStatus('Sent');
    } catch (err) {
      setTestStatus(`Error: ${err.message}`);
    }
  }

  const hint =
    'Stored in an encrypted vault on this server, never in the regular database. ' +
    'Bring your own Telegram bot — nothing here is shared with other users.';

  if (!vault) {
    return (
      <div className="subs-form">
        <h2 className="subs-form__heading">Integrations</h2>
        <p className="subs-form__hint">{hint}</p>
        <p className="subs-dashboard__empty">Loading…</p>
      </div>
    );
  }

  return (
    <SettingsSection
      title="Integrations"
      hint={hint}
      saveLabel="Save integrations"
      initialStatus={loadError}
      confirm={{
        title: 'Save integrations?',
        message: 'This will overwrite your saved Telegram credentials.',
      }}
      onSave={async () => {
        setVault({ ...EMPTY_VAULT, ...(await api('/api/vault', 'PUT', vault)) });
        return 'Integrations saved.';
      }}
      footer={
        <div className="subs-test-action">
          <button type="button" className="link" onClick={sendTest} disabled={testStatus === 'sending'}>
            {testStatus === 'sending' ? 'Sending test Telegram message…' : 'Send test Telegram message'}
          </button>
          {testStatus && testStatus !== 'sending' && (
            <span className="subs-test-action__status">{testStatus}</span>
          )}
        </div>
      }
    >
      <span className="subs-form__label">Telegram</span>
      <div className="subs-form__row">
        <FormField
          label="Bot token"
          type="password"
          value={vault.telegramBotToken}
          onChange={setVaultField('telegramBotToken')}
        />
        <FormField label="Chat ID" value={vault.telegramChatId} onChange={setVaultField('telegramChatId')} />
      </div>
      <p className="subs-form__hint">
        Message your bot on Telegram (search its username, press Start, send anything) and it will
        reply with the chat ID to paste above.
      </p>
    </SettingsSection>
  );
}

export default function SettingsPage() {
  const { user, updateAccount, updatePassword } = useAuth();

  const [email, setEmail] = useState(user?.email || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const setPassword = (key) => (value) => setPasswords((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="subs-dashboard">
      <PageHeader title="Settings" />

      <SettingsSection
        title="Basic settings"
        saveLabel="Save email"
        confirm={{ title: 'Update email?', message: `Change your account email to "${email}"?` }}
        onSave={() => updateAccount('email', email).then(() => 'Email updated.')}
      >
        <FormField label="Email" type="email" value={email} onChange={setEmail} required />
      </SettingsSection>

      <SettingsSection
        title="Currency"
        saveLabel="Save currency"
        confirm={{
          title: 'Update currency?',
          message: `Change your display currency to ${CURRENCIES[currency]?.label || currency}?`,
        }}
        onSave={() => updateAccount('currency', currency).then(() => 'Currency updated.')}
      >
        <FormField label="Display currency">
          <SelectInput value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </FormField>
      </SettingsSection>

      <SettingsSection
        title="Timezone"
        hint={
          'Reminder times you set (e.g. "9:00 AM") are sent based on this timezone. ' +
          "It's auto-detected from your browser each time you sign in, " +
          "so you shouldn't normally need to change it here."
        }
        saveLabel="Save timezone"
        confirm={{
          title: 'Update timezone?',
          message: `Reminder times will be sent using ${timezone} from now on.`,
        }}
        onSave={() => updateAccount('timezone', timezone).then(() => 'Timezone updated.')}
      >
        <FormField
          label="Timezone"
          list="timezone-options"
          value={timezone}
          onChange={setTimezone}
          autoComplete="off"
        />
        <datalist id="timezone-options">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </SettingsSection>

      <SettingsSection
        title="Security"
        saveLabel="Update password"
        confirm={{
          title: 'Update password?',
          message: "You'll need your new password the next time you sign in.",
        }}
        validate={() => {
          if (passwords.next !== passwords.confirm) return 'New passwords do not match';
          if (passwords.next.length < 6) return 'New password must be at least 6 characters';
        }}
        onSave={async () => {
          await updatePassword(passwords.current, passwords.next);
          setPasswords({ current: '', next: '', confirm: '' });
          return 'Password updated.';
        }}
      >
        <FormField
          label="Current password"
          type="password"
          value={passwords.current}
          onChange={setPassword('current')}
          required
        />
        <div className="subs-form__row">
          <FormField
            label="New password"
            type="password"
            value={passwords.next}
            onChange={setPassword('next')}
            required
          />
          <FormField
            label="Confirm new password"
            type="password"
            value={passwords.confirm}
            onChange={setPassword('confirm')}
            required
          />
        </div>
      </SettingsSection>

      <IntegrationsSection />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  DatabaseBackup,
  KeyRound,
  Loader2,
  Palette,
  PlugZap,
  RefreshCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBackupSettings,
  getBrandingSettings,
  getInstitutionSettings,
  getIntegrationSettings,
  updateBackupSettings,
  updateBrandingSettings,
  updateInstitutionSettings,
  updateIntegrationSettings,
} from '../../api/settings';
import {
  emptyBackupSettings,
  emptyBrandingSettings,
  emptyInstitutionSettings,
  emptyIntegrationSettings,
  normalizeBackupSettings,
  normalizeBrandingSettings,
  normalizeInstituteSettings,
  normalizeInstitutionSettings,
  normalizeIntegrationSettings,
  secretIntegrationFields,
} from './settingsModel';
import {
  countConfiguredSecrets,
  formatDisplayDate,
  summarizeSettings,
  toDateTimeInputValue,
  validateBackupSettings,
  validateBrandingSettings,
  validateInstitutionSettings,
  validateIntegrationsSettings,
} from './settingsUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const TABS = [
  { id: 'institution', label: 'Institution', icon: Building2, permission: 'view' },
  { id: 'branding', label: 'Branding', icon: Palette, permission: 'view' },
  { id: 'integrations', label: 'Integrations', icon: PlugZap, permission: 'manage' },
  { id: 'backup', label: 'Backup', icon: DatabaseBackup, permission: 'manage' },
];

const SECRET_LABELS = {
  smsApiKey: 'SMS API Key',
  whatsappApiKey: 'WhatsApp API Key',
  emailApiKey: 'Email API Key',
  paymentKeyId: 'Payment Key ID',
  paymentKeySecret: 'Payment Key Secret',
  fcmServerKey: 'FCM Server Key',
};

const textInputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20 disabled:cursor-not-allowed disabled:opacity-70';

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function buildSecretState() {
  return Object.fromEntries(secretIntegrationFields.map((field) => [field, '']));
}

function buildClearState() {
  return Object.fromEntries(secretIntegrationFields.map((field) => [field, false]));
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'configured', 'enabled', 'set', 'daily', 'weekly', 'monthly'].includes(normalized)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['pending', 'missing', 'not set'].includes(normalized)) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-2xl font-bold text-[#003434]">{loading ? '-' : value}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">
      {message}
    </div>
  );
}

function SectionHeader({ badge, icon, title }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/45 text-[#006a62]">{icon}</span>
        <h2 className="text-sm font-bold text-[#003434]">{title}</h2>
      </div>
      {badge && <span className={cx('w-fit rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(badge))}>{badge}</span>}
    </div>
  );
}

function TextField({ disabled, label, onChange, placeholder = '', type = 'text', value }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={textInputClass}
      />
    </label>
  );
}

function TextAreaField({ disabled, label, onChange, rows = 4, value }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        className={`${textInputClass} py-3`}
      />
    </label>
  );
}

function ColorField({ disabled, label, onChange, value }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">{label}</span>
      <div className="flex min-h-11 overflow-hidden rounded-xl border border-white/40 bg-white/45">
        <input
          type="color"
          value={value || '#004d4d'}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-14 cursor-pointer border-0 bg-transparent p-1 disabled:cursor-not-allowed"
        />
        <input
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-[#071e27] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </label>
  );
}

function SecretField({ clear, disabled, field, onClearChange, onValueChange, set, value }) {
  return (
    <div className="rounded-xl bg-white/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#3f4848]">{SECRET_LABELS[field]}</span>
        <span className={cx('rounded-full border px-3 py-1 text-[10px] font-bold uppercase', statusClasses(set ? 'set' : 'missing'))}>
          {set ? 'Set' : 'Missing'}
        </span>
      </div>
      <input
        type="password"
        value={value || ''}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled || clear}
        placeholder={set ? 'Stored key remains unchanged' : ''}
        className={`${textInputClass} mt-3`}
      />
      <label className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#004d4d]">
        <input
          type="checkbox"
          checked={clear}
          onChange={(event) => onClearChange(event.target.checked)}
          disabled={disabled || !set}
          className="h-4 w-4 rounded border-white/50 text-[#006a62]"
        />
        Clear stored key
      </label>
    </div>
  );
}

export default function SettingsManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('institution');
  const [institution, setInstitution] = useState(emptyInstitutionSettings);
  const [branding, setBranding] = useState(emptyBrandingSettings);
  const [integrations, setIntegrations] = useState(emptyIntegrationSettings);
  const [backup, setBackup] = useState(emptyBackupSettings);
  const [integrationSecrets, setIntegrationSecrets] = useState(buildSecretState);
  const [clearSecrets, setClearSecrets] = useState(buildClearState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'settings.view');
  const canManage = hasPermission(currentUser, 'settings.manage');
  const availableTabs = useMemo(() => TABS.filter((tab) => tab.permission === 'view' || canManage), [canManage]);

  const loadSettings = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [institutionData, brandingData] = await Promise.all([
        getInstitutionSettings(),
        getBrandingSettings(),
      ]);
      setInstitution(normalizeInstitutionSettings(institutionData));
      setBranding(normalizeBrandingSettings(brandingData));

      if (canManage) {
        const [integrationData, backupData] = await Promise.all([
          getIntegrationSettings(),
          getBackupSettings(),
        ]);
        setIntegrations(normalizeIntegrationSettings(integrationData));
        setBackup(normalizeBackupSettings(backupData));
      } else {
        setIntegrations(emptyIntegrationSettings);
        setBackup(emptyBackupSettings);
      }
      setIntegrationSecrets(buildSecretState());
      setClearSecrets(buildClearState());
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend settings.', error);
      setLoadError(error?.message || 'Unable to load settings from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canManage, canView]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadSettings();
    });
    return () => {
      active = false;
    };
  }, [loadSettings]);

  const effectiveActiveTab = availableTabs.some((tab) => tab.id === activeTab) ? activeTab : availableTabs[0]?.id || 'institution';
  const summary = useMemo(() => summarizeSettings(institution, branding, integrations, backup), [backup, branding, institution, integrations]);
  const disabled = !canManage || Boolean(saving);

  const updateInstitutionField = (key, value) => setInstitution((current) => ({ ...current, [key]: value }));
  const updateBrandingField = (key, value) => setBranding((current) => ({ ...current, [key]: value }));
  const updateIntegrationField = (key, value) => setIntegrations((current) => ({ ...current, [key]: value }));
  const updateBackupField = (key, value) => setBackup((current) => ({ ...current, [key]: value }));

  const saveActiveSettings = async () => {
    if (!canManage) {
      toast.error('You do not have permission to manage settings.');
      return;
    }

    try {
      setSaving(effectiveActiveTab);
      if (effectiveActiveTab === 'institution') {
        const validationMessage = validateInstitutionSettings(institution);
        if (validationMessage) throw new Error(validationMessage);
        const payload = {
          name: trimValue(institution.name),
          address: trimValue(institution.address),
          phone: trimValue(institution.phone),
          email: trimValue(institution.email),
          website: trimValue(institution.website),
          academicYear: trimValue(institution.academicYear),
          affiliation: trimValue(institution.affiliation),
          registrationNumber: trimValue(institution.registrationNumber),
        };
        const saved = normalizeInstitutionSettings(await updateInstitutionSettings(payload));
        setInstitution(saved);
        window.dispatchEvent(new CustomEvent('institute-settings-updated', {
          detail: normalizeInstituteSettings(saved),
        }));
        toast.success('Institution settings saved');
      }

      if (effectiveActiveTab === 'branding') {
        const validationMessage = validateBrandingSettings(branding);
        if (validationMessage) throw new Error(validationMessage);
        const payload = {
          logoKey: trimValue(branding.logoKey),
          logoUrl: trimValue(branding.logoUrl),
          primaryColor: trimValue(branding.primaryColor),
          secondaryColor: trimValue(branding.secondaryColor),
          theme: trimValue(branding.theme),
          receiptHeader: trimValue(branding.receiptHeader),
          reportCardTemplate: trimValue(branding.reportCardTemplate),
          idCardTemplate: trimValue(branding.idCardTemplate),
        };
        setBranding(normalizeBrandingSettings(await updateBrandingSettings(payload)));
        toast.success('Branding settings saved');
      }

      if (effectiveActiveTab === 'integrations') {
        const validationMessage = validateIntegrationsSettings(integrations);
        if (validationMessage) throw new Error(validationMessage);
        const payload = {
          smsSenderId: trimValue(integrations.smsSenderId),
          smsProvider: trimValue(integrations.smsProvider),
          whatsappProvider: trimValue(integrations.whatsappProvider),
          emailProvider: trimValue(integrations.emailProvider),
          emailFrom: trimValue(integrations.emailFrom),
          paymentProvider: trimValue(integrations.paymentProvider),
          storageProvider: trimValue(integrations.storageProvider),
        };
        secretIntegrationFields.forEach((field) => {
          if (clearSecrets[field]) payload[field] = '';
          else if (integrationSecrets[field]?.trim()) payload[field] = integrationSecrets[field].trim();
        });
        setIntegrations(normalizeIntegrationSettings(await updateIntegrationSettings(payload)));
        setIntegrationSecrets(buildSecretState());
        setClearSecrets(buildClearState());
        toast.success('Integration settings saved');
      }

      if (effectiveActiveTab === 'backup') {
        const validationMessage = validateBackupSettings(backup);
        if (validationMessage) throw new Error(validationMessage);
        const payload = {
          schedule: trimValue(backup.schedule),
          retentionDays: backup.retentionDays === '' ? '' : Number(backup.retentionDays),
          externalTarget: trimValue(backup.externalTarget),
          lastBackupAt: backup.lastBackupAt || '',
        };
        setBackup(normalizeBackupSettings(await updateBackupSettings(payload)));
        toast.success('Backup settings saved');
      }
      setLoadError('');
    } catch (error) {
      toast.error(error?.message || 'Settings were not saved.');
    } finally {
      setSaving('');
    }
  };

  if (!canView) {
    return (
      <div className="erp-settings-page">
        <EmptyState message="You do not have permission to view settings." />
      </div>
    );
  }

  return (
    <div className="erp-settings-page">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#006a62]">Admin Setup</p>
          <h1 className="mt-1 font-['Montserrat'] text-3xl font-bold text-[#003434]">Settings</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">Institution, branding, integrations, and backup.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={loadSettings} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d] disabled:opacity-70">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          {canManage && (
            <button type="button" onClick={saveActiveSettings} disabled={Boolean(saving) || loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Building2 size={20} className="text-[#006a62]" />} label="Institution" loading={loading} value={summary.institutionConfigured ? 'Ready' : 'Pending'} />
        <SummaryCard icon={<Palette size={20} className="text-[#006a62]" />} label="Branding" loading={loading} value={summary.brandingConfigured ? 'Configured' : 'Pending'} />
        <SummaryCard icon={<PlugZap size={20} className="text-[#006a62]" />} label="Integrations" loading={loading} value={`${summary.providersConfigured}/${countConfiguredSecrets(integrations)}`} />
        <SummaryCard icon={<DatabaseBackup size={20} className="text-[#006a62]" />} label="Backup" loading={loading} value={`${summary.backupSchedule} / ${summary.retentionDays}d`} />
      </div>

      <div className="my-5 flex flex-wrap gap-2">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition',
                effectiveActiveTab === tab.id ? 'bg-[#004d4d] text-white shadow-[0_12px_28px_rgba(0,77,77,.18)]' : 'bg-white/45 text-[#004d4d]'
              )}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {!canManage && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-800">
          You can view settings but cannot save changes.
        </div>
      )}

      {effectiveActiveTab === 'institution' && (
        <section className="erp-glass-card overflow-hidden rounded-2xl">
          <SectionHeader
            badge={summary.institutionConfigured ? 'Ready' : 'Pending'}
            icon={<Building2 size={19} />}
            title="Institution"
          />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <TextField disabled={disabled} label="Name *" value={institution.name} onChange={(value) => updateInstitutionField('name', value)} />
            <TextField disabled={disabled} label="Academic Year" value={institution.academicYear} onChange={(value) => updateInstitutionField('academicYear', value)} />
            <TextField disabled={disabled} label="Phone" value={institution.phone} onChange={(value) => updateInstitutionField('phone', value)} />
            <TextField disabled={disabled} label="Email" type="email" value={institution.email} onChange={(value) => updateInstitutionField('email', value)} />
            <TextField disabled={disabled} label="Website" value={institution.website} onChange={(value) => updateInstitutionField('website', value)} />
            <TextField disabled={disabled} label="Affiliation" value={institution.affiliation} onChange={(value) => updateInstitutionField('affiliation', value)} />
            <TextField disabled={disabled} label="Registration Number" value={institution.registrationNumber} onChange={(value) => updateInstitutionField('registrationNumber', value)} />
            <div className="rounded-xl bg-white/40 p-4">
              <p className="text-xs font-bold uppercase text-[#3f4848]">Updated</p>
              <p className="mt-2 text-sm font-bold text-[#071e27]">{formatDisplayDate(institution.updatedAt)}</p>
              <p className="mt-1 text-xs font-semibold text-[#3f4848]">{institution.updatedBy || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <TextAreaField disabled={disabled} label="Address" rows={3} value={institution.address} onChange={(value) => updateInstitutionField('address', value)} />
            </div>
          </div>
        </section>
      )}

      {effectiveActiveTab === 'branding' && (
        <section className="erp-glass-card overflow-hidden rounded-2xl">
          <SectionHeader
            badge={summary.brandingConfigured ? 'Configured' : 'Pending'}
            icon={<Palette size={19} />}
            title="Branding"
          />
          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField disabled={disabled} label="Logo Key" value={branding.logoKey} onChange={(value) => updateBrandingField('logoKey', value)} />
              <TextField disabled={disabled} label="Logo URL" value={branding.logoUrl} onChange={(value) => updateBrandingField('logoUrl', value)} />
              <ColorField disabled={disabled} label="Primary Color" value={branding.primaryColor} onChange={(value) => updateBrandingField('primaryColor', value)} />
              <ColorField disabled={disabled} label="Secondary Color" value={branding.secondaryColor} onChange={(value) => updateBrandingField('secondaryColor', value)} />
              <TextField disabled={disabled} label="Theme" value={branding.theme} onChange={(value) => updateBrandingField('theme', value)} />
              <TextField disabled={disabled} label="Receipt Header" value={branding.receiptHeader} onChange={(value) => updateBrandingField('receiptHeader', value)} />
              <div className="md:col-span-2">
                <TextAreaField disabled={disabled} label="Report Card Template" value={branding.reportCardTemplate} onChange={(value) => updateBrandingField('reportCardTemplate', value)} />
              </div>
              <div className="md:col-span-2">
                <TextAreaField disabled={disabled} label="ID Card Template" value={branding.idCardTemplate} onChange={(value) => updateBrandingField('idCardTemplate', value)} />
              </div>
            </div>
            <div className="rounded-2xl bg-white/40 p-5">
              <div className="flex h-32 items-center justify-center rounded-xl border border-white/45 bg-white/55 p-4">
                {branding.logoUrl ? <img src={branding.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 size={34} className="text-[#6f7978]" />}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-16 rounded-xl border border-white/40" style={{ backgroundColor: branding.primaryColor || '#004d4d' }} />
                <div className="h-16 rounded-xl border border-white/40" style={{ backgroundColor: branding.secondaryColor || '#66d9cc' }} />
              </div>
              <p className="mt-4 text-sm font-bold text-[#003434]">{branding.receiptHeader || institution.name || 'Collegesoft'}</p>
              <p className="mt-1 text-xs font-semibold text-[#3f4848]">{branding.theme || 'Theme not set'}</p>
            </div>
          </div>
        </section>
      )}

      {effectiveActiveTab === 'integrations' && canManage && (
        <section className="erp-glass-card overflow-hidden rounded-2xl">
          <SectionHeader
            badge={`${summary.providersConfigured} providers`}
            icon={<PlugZap size={19} />}
            title="Integrations"
          />
          <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField disabled={disabled} label="SMS Provider" value={integrations.smsProvider} onChange={(value) => updateIntegrationField('smsProvider', value)} />
              <TextField disabled={disabled} label="SMS Sender ID" value={integrations.smsSenderId} onChange={(value) => updateIntegrationField('smsSenderId', value)} />
              <TextField disabled={disabled} label="WhatsApp Provider" value={integrations.whatsappProvider} onChange={(value) => updateIntegrationField('whatsappProvider', value)} />
              <TextField disabled={disabled} label="Email Provider" value={integrations.emailProvider} onChange={(value) => updateIntegrationField('emailProvider', value)} />
              <TextField disabled={disabled} label="Email From" type="email" value={integrations.emailFrom} onChange={(value) => updateIntegrationField('emailFrom', value)} />
              <TextField disabled={disabled} label="Payment Provider" value={integrations.paymentProvider} onChange={(value) => updateIntegrationField('paymentProvider', value)} />
              <TextField disabled={disabled} label="Storage Provider" value={integrations.storageProvider} onChange={(value) => updateIntegrationField('storageProvider', value)} />
            </div>
            <div className="grid gap-3">
              {secretIntegrationFields.map((field) => (
                <SecretField
                  key={field}
                  clear={clearSecrets[field]}
                  disabled={disabled}
                  field={field}
                  set={Boolean(integrations[`${field}Set`])}
                  value={integrationSecrets[field]}
                  onClearChange={(value) => setClearSecrets((current) => ({ ...current, [field]: value }))}
                  onValueChange={(value) => setIntegrationSecrets((current) => ({ ...current, [field]: value }))}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {effectiveActiveTab === 'backup' && canManage && (
        <section className="erp-glass-card overflow-hidden rounded-2xl">
          <SectionHeader
            badge={summary.backupSchedule}
            icon={<DatabaseBackup size={19} />}
            title="Backup"
          />
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_260px]">
            <TextField disabled={disabled} label="Schedule *" value={backup.schedule} onChange={(value) => updateBackupField('schedule', value)} />
            <TextField disabled={disabled} label="Retention Days" type="number" value={backup.retentionDays} onChange={(value) => updateBackupField('retentionDays', value)} />
            <TextField disabled={disabled} label="External Target" value={backup.externalTarget} onChange={(value) => updateBackupField('externalTarget', value)} />
            <TextField disabled={disabled} label="Last Backup At" type="datetime-local" value={toDateTimeInputValue(backup.lastBackupAt)} onChange={(value) => updateBackupField('lastBackupAt', value)} />
            <div className="rounded-xl bg-white/40 p-4 md:col-span-2 xl:col-span-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#004d4d]">
                  <BadgeCheck size={13} /> {backup.schedule || 'daily'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#004d4d]">
                  <ShieldCheck size={13} /> {backup.retentionDays ?? 7} days
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#004d4d]">
                  <KeyRound size={13} /> {backup.externalTarget || '-'}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#3f4848]">Last backup: {formatDisplayDate(backup.lastBackupAt)}</p>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="mt-5 rounded-xl bg-white/40 p-5 text-center text-sm font-semibold text-[#3f4848]">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading settings...
        </div>
      )}

      {!loading && saving && (
        <div className="mt-5 rounded-xl bg-white/40 p-5 text-center text-sm font-semibold text-[#3f4848]">
          <CheckCircle2 className="mr-2 inline" size={16} /> Saving settings...
        </div>
      )}
    </div>
  );
}

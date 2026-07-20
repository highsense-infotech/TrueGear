import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Mail, Send } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import {
  getEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  type EmailSettings as EmailSettingsData,
  type MailAuthType,
} from "../../api/emailSettings.api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable field styling to match the Settings page (white card, dark labels).
const inputCls =
  "mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-3 text-[13px] text-[#333] bg-white outline-none focus:border-[#ff4f31]";
const labelCls = "block text-sm font-medium text-[#333]";

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-[#ff4f31]" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

const EmailSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [clientSecretConfigured, setClientSecretConfigured] = useState(false);

  const [authType, setAuthType] = useState<MailAuthType>("BASIC");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  // BASIC
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // MICROSOFT_OAUTH2
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  // Common
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const isOAuth = authType === "MICROSOFT_OAUTH2";

  useEffect(() => {
    (async () => {
      try {
        const res = await getEmailSettings();
        if (res.success && res.data) {
          const d: EmailSettingsData = res.data;
          setAuthType(d.authType ?? "BASIC");
          setHost(d.host ?? "");
          setPort(String(d.port ?? 587));
          setSecure(!!d.secure);
          setUsername(d.username ?? "");
          setTenantId(d.tenantId ?? "");
          setClientId(d.clientId ?? "");
          setSenderEmail(d.senderEmail ?? "");
          setFromName(d.fromName ?? "");
          setFromEmail(d.fromEmail ?? "");
          setReplyTo(d.replyTo ?? "");
          setEnabled(!!d.enabled);
          setPasswordConfigured(!!d.passwordConfigured);
          setClientSecretConfigured(!!d.clientSecretConfigured);
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.error?.message ?? "Failed to load email settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validate = (): string | null => {
    if (!host.trim()) return "SMTP host is required";
    const p = Number(port);
    if (!port.trim() || !Number.isInteger(p) || p < 1 || p > 65535) return "Port must be a number between 1 and 65535";
    if (isOAuth) {
      if (!tenantId.trim()) return "Tenant ID is required";
      if (!clientId.trim()) return "Client ID is required";
      if (!clientSecretConfigured && !clientSecret.trim()) return "Client secret is required";
      if (!EMAIL_RE.test(senderEmail.trim())) return "A valid sender email is required";
    } else {
      if (!username.trim()) return "Username is required";
      if (!passwordConfigured && !password.trim()) return "Password is required";
    }
    if (!EMAIL_RE.test(fromEmail.trim())) return "A valid From email is required";
    if (replyTo.trim() && !EMAIL_RE.test(replyTo.trim())) return "Reply-To must be a valid email";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const res = await updateEmailSettings({
        authType,
        host: host.trim(),
        port: Number(port),
        secure,
        ...(isOAuth
          ? {
              tenantId: tenantId.trim(),
              clientId: clientId.trim(),
              senderEmail: senderEmail.trim(),
              // Only send a secret when the admin typed one; blank keeps the existing.
              ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
            }
          : {
              username: username.trim(),
              ...(password.trim() ? { password: password.trim() } : {}),
            }),
        fromName: fromName.trim() || null,
        fromEmail: fromEmail.trim(),
        replyTo: replyTo.trim() || null,
        enabled,
      });
      if (res.success) {
        toast.success("Email settings saved");
        setPassword("");
        setClientSecret("");
        setPasswordConfigured(res.data?.passwordConfigured ?? passwordConfigured);
        setClientSecretConfigured(res.data?.clientSecretConfigured ?? clientSecretConfigured);
      } else {
        toast.error(res.error?.message ?? "Failed to save settings");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!EMAIL_RE.test(testTo.trim())) return toast.error("Enter a valid recipient email");
    setTesting(true);
    try {
      const res = await sendTestEmail(testTo.trim());
      if (res.success) {
        toast.success("Test email sent");
        setTestOpen(false);
        setTestTo("");
      } else {
        toast.error(res.error?.message ?? "Test email failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Test email failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm max-w-2xl flex items-center gap-2 text-[#999] text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading email settings…
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 md:p-6 shadow-sm max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={18} className="text-[#ff4f31]" />
        <h2 className="text-lg font-semibold text-[#333]">Email (SMTP)</h2>
      </div>
      <p className="text-[#999] text-xs mb-6">Configure the SMTP server used to send all outgoing emails.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Authentication Type</label>
          <select className={inputCls} value={authType} onChange={(e) => setAuthType(e.target.value as MailAuthType)}>
            <option value="BASIC">Basic (Username &amp; Password)</option>
            <option value="MICROSOFT_OAUTH2">Microsoft 365 (OAuth 2.0)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>SMTP Host</label>
          <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder={isOAuth ? "smtp.office365.com" : "smtp.gmail.com"} />
        </div>
        <div>
          <label className={labelCls}>SMTP Port</label>
          <input className={inputCls} value={port} onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="587" />
        </div>

        {isOAuth ? (
          <>
            <div>
              <label className={labelCls}>Tenant ID</label>
              <input className={inputCls} value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Directory (tenant) ID" autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>Client ID</label>
              <input className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Application (client) ID" autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>Client Secret</label>
              <input
                className={inputCls}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={clientSecretConfigured ? "•••••••• (leave blank to keep)" : "Enter client secret"}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelCls}>Sender Email (Mailbox)</label>
              <input className={inputCls} value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="noreply@company.com" autoComplete="off" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@company.com" autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={passwordConfigured ? "•••••••• (leave blank to keep)" : "Enter SMTP password"}
                autoComplete="new-password"
              />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>From Name</label>
          <input className={inputCls} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="ELT Group" />
        </div>
        <div>
          <label className={labelCls}>From Email</label>
          <input className={inputCls} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@company.com" />
        </div>
        <div>
          <label className={labelCls}>Reply To</label>
          <input className={inputCls} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@company.com (optional)" />
        </div>
        <div className="flex items-end gap-6">
          <div className="flex items-center gap-2">
            <Toggle id="secure" checked={secure} onChange={setSecure} />
            <span className="text-sm text-[#333]">Secure (TLS/SSL)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle id="enabled" checked={enabled} onChange={setEnabled} />
          <span className="text-sm text-[#333]">Enable Email</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="gradient" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={() => setTestOpen(true)} disabled={saving} className="w-full sm:w-auto" icon={<Send size={16} />}>
          Test Email
        </Button>
      </div>

      <Modal isOpen={testOpen} onClose={() => setTestOpen(false)} title="Send Test Email">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Recipient Email</label>
            <input
              className={inputCls}
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => { if (e.key === "Enter" && !testing) handleSendTest(); }}
            />
            <p className="mt-2 text-xs text-[#999]">Uses the currently saved settings. Save any changes first.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTestOpen(false)} disabled={testing} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSendTest} disabled={testing} className="w-full sm:w-auto">
              {testing ? "Sending…" : "Send Test"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmailSettings;

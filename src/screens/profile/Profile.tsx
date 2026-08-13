import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Camera, X, Save, Eye, EyeOff } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
} from "../../api/auth.api";

const labelClass = "block text-[13px] font-medium text-[#333] mb-1.5";
const inputClass =
  "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent";
const inputErrorClass =
  "w-full px-3 py-2.5 border border-[#FE2B73] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#FE2B73] focus:border-transparent";

const USERNAME_REGEX = /^[a-z0-9_]+$/;

const Profile: React.FC = () => {
  const { updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load the freshest profile from the server (avatar comes back signed).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getProfile();
        if (!active) return;
        const p = res.data;
        if (p) {
          setFullName(p.fullName ?? "");
          setUsername(p.username ?? "");
          setEmail(p.email ?? "");
          setAvatarUrl(p.avatarUrl ?? null);
          setRole(p.role?.name ?? "");
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!username.trim()) next.username = "Username is required";
    else if (username.length < 3) next.username = "Username must be at least 3 characters";
    else if (!USERNAME_REGEX.test(username))
      next.username = "Only lowercase letters, digits, and underscores";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Invalid email address";
    if (password) {
      if (password.length < 8) next.password = "At least 8 characters";
      else if (!/[A-Z]/.test(password)) next.password = "Include an uppercase letter";
      else if (!/[a-z]/.test(password)) next.password = "Include a lowercase letter";
      else if (!/[0-9]/.test(password)) next.password = "Include a number";
      else if (password !== confirm) next.confirm = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePhotoPick = () => fileRef.current?.click();

  const handlePhotoFile = async (file: File | null) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const res = await uploadProfilePhoto(file);
      const url = res.data?.avatarUrl ?? null;
      setAvatarUrl(url);
      updateUser({ avatarUrl: url });
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to upload photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!avatarUrl) return;
    setPhotoBusy(true);
    try {
      await removeProfilePhoto();
      setAvatarUrl(null);
      updateUser({ avatarUrl: null });
      toast.success("Photo removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to remove photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await updateProfile({
        fullName: fullName.trim() || null,
        username: username.trim(),
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      const p = res.data;
      if (p) {
        setFullName(p.fullName ?? "");
        setUsername(p.username ?? "");
        setEmail(p.email ?? "");
        setAvatarUrl(p.avatarUrl ?? null);
        // Refresh the cached user so the header reflects the new name/email.
        updateUser({
          fullName: p.fullName,
          username: p.username,
          email: p.email,
          avatarUrl: p.avatarUrl,
        });
      }
      setPassword("");
      setConfirm("");
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#ff4f31] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#333]">My Profile</h1>
        <p className="text-[13px] text-[#999]">Manage your personal details and account credentials.</p>
      </div>

      <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
        {/* Photo */}
        <div className="flex items-center gap-5 p-5 border-b border-[#f0f0f0]">
          <div className="relative">
            <Avatar src={avatarUrl} name={fullName} fallback={username} size={80} />
            {photoBusy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePhotoPick}
                disabled={photoBusy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#faedee] text-[#ff4f31] text-[13px] font-medium hover:bg-[#ffe5ed] disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {avatarUrl ? "Change Photo" : "Upload Photo"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoBusy}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] text-[#999] hover:text-[#FE2B73] hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#999]">JPG, PNG or WEBP.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              handlePhotoFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        {/* Fields */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className={errors.username ? inputErrorClass : inputClass}
            />
            {errors.username && <p className="text-[11px] text-[#FE2B73] mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? inputErrorClass : inputClass}
            />
            {errors.email && <p className="text-[11px] text-[#FE2B73] mt-1">{errors.email}</p>}
          </div>

          {role && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Role</label>
              <input type="text" value={role} disabled className={`${inputClass} bg-[#f9fafb] text-[#777]`} />
            </div>
          )}

          <div className="sm:col-span-2 border-t border-[#f0f0f0] pt-4 mt-1">
            <p className="text-[13px] font-medium text-[#333]">Change Password</p>
            <p className="text-[11px] text-[#999] mb-3">Leave blank to keep your current password.</p>
          </div>

          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? inputErrorClass : inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#666]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-[#FE2B73] mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={errors.confirm ? inputErrorClass : inputClass}
            />
            {errors.confirm && <p className="text-[11px] text-[#FE2B73] mt-1">{errors.confirm}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#f0f0f0] bg-[#fafafa] flex justify-end">
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving}
            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

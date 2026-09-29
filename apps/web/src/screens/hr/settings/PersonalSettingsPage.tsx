import React, { useEffect, useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  Input,
  Textarea,
} from "ui";
import { User, ShieldCheck, Camera, Loader2 } from "lucide-react";
import { useAppSelector } from "../../../store";
import { useHrMutations, useHrQuery } from "../useHrWorkspace";
import { api } from "../../../common/api";
import { ImageCropModal } from "../components/ImageCropModal";

const inputClassName =
  "h-11 rounded-lg border-slate-200 bg-white font-semibold text-secondary placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary";

const getInitials = (name?: string) => {
  if (!name?.trim()) return "EE";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export function PersonalSettingsPage() {
  const generatedId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppSelector((state) => state.auth.user);

  // Queries & Mutations
  const { data: emp, isLoading } = useHrQuery<any>(
    ["hr", "employee", user?.id],
    `/employees/me`,
    undefined,
  );
  const mutations = useHrMutations();

  // State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [image, setImage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [imageFileName, setImageFileName] = useState("");
  const [imageError, setImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const [pendingCropFileName, setPendingCropFileName] = useState("");

  useEffect(() => {
    if (emp) {
      setFullName(emp.fullName ?? "");
      setPhone(emp.phone ?? "");
      setAddress(emp.address ?? "");
      setImage(emp.image ?? "");
    }
  }, [emp]);

  const readImageFile = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPG, PNG, or WebP images are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Keep the photo under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingCropImage(reader.result as string);
      setPendingCropFileName(file.name);
      setImageError("");
    };
    reader.onerror = () => {
      setImageError("Could not read that image. Try another file.");
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setImage(croppedDataUrl);
    setImageFileName(pendingCropFileName);
    setPendingCropImage(null);
    setPendingCropFileName("");
  };

  const handleCropCancel = () => {
    setPendingCropImage(null);
    setPendingCropFileName("");
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readImageFile(file);
    }
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    setImage("");
    setImageFileName("");
    setImageError("");
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (phone.trim() && !/^[0-9]{10}$/.test(phone.trim())) {
      toast.error("Contact phone must be exactly 10 digits");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = image;
      if (image && image.startsWith("data:image/")) {
        const fileToUpload = dataURLtoFile(
          image,
          imageFileName || "avatar.png",
        );
        const uploadForm = new FormData();
        uploadForm.append("file", fileToUpload);
        const uploadRes = await api.post<{ url: string }>(
          "/uploads/images",
          uploadForm,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        imageUrl = uploadRes.data.url;
      }

      await mutations.updateEmployee.mutateAsync({
        id: user!.id,
        data: {
          fullName,
          phone: phone || undefined,
          address: address || undefined,
          image: imageUrl || undefined,
        },
      });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Unable to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!password) {
      toast.error("Please enter a new password");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await mutations.updateEmployee.mutateAsync({
        id: user!.id,
        data: {
          password,
        },
      });
      toast.success("Password changed successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Unable to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-3 text-sm font-semibold text-muted-foreground">
          Loading settings...
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Profile Details Card */}
      <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-secondary">
            <User className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-secondary">
              Profile Details
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Update your photo, name, and contact details
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
            <div className="relative group">
              <Avatar
                className="h-20 w-20 border border-slate-200"
                style={{ width: 80, height: 80 }}
              >
                <AvatarImage
                  src={image || undefined}
                  alt={fullName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <AvatarFallback className="bg-slate-100 text-xl font-bold text-secondary">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="size-5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 rounded-lg text-xs"
                >
                  Upload new photo
                </Button>
                {image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="h-8 rounded-lg text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                JPG, PNG, or WebP up to 5 MB
              </p>
              {imageError && (
                <p className="text-xs font-semibold text-red-500">
                  {imageError}
                </p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-secondary">
                Full Name
              </span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className={inputClassName}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-secondary">
                  Email (Read-only)
                </span>
                <Input
                  value={emp?.email ?? ""}
                  className={`${inputClassName} bg-slate-50/50 text-slate-400`}
                  disabled
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold text-secondary">
                  Contact Phone
                </span>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className={inputClassName}
                  maxLength={10}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-secondary">
                Residential Address
              </span>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your current address details..."
                className="min-h-[90px] rounded-lg border-slate-200 bg-white font-semibold text-secondary placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Security / Password Card */}
      <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-secondary">
            <IconWrapper icon={ShieldCheck} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-secondary">
              Security & Password
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Secure your account by updating your login password
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePassword} className="mt-6 space-y-5">
          <div className="space-y-4">
            <label
              className="block space-y-2"
              htmlFor={`${generatedId}-new-password`}
            >
              <span className="text-xs font-semibold text-secondary">
                New Password
              </span>
              <Input
                id={`${generatedId}-new-password`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClassName}
                autoComplete="new-password"
                required
              />
            </label>

            <label
              className="block space-y-2"
              htmlFor={`${generatedId}-confirm-password`}
            >
              <span className="text-xs font-semibold text-secondary">
                Confirm New Password
              </span>
              <Input
                id={`${generatedId}-confirm-password`}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputClassName}
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Card>

      <ImageCropModal
        isOpen={pendingCropImage !== null}
        imageSrc={pendingCropImage || ""}
        onClose={handleCropCancel}
        onCropComplete={handleCropComplete}
        cropShape="round"
        aspect={1}
      />
    </div>
  );
}

// Simple wrapper helper to avoid rendering issues with Icon components
function IconWrapper({ icon: Icon }: { icon: React.ComponentType<any> }) {
  return <Icon className="size-5" />;
}

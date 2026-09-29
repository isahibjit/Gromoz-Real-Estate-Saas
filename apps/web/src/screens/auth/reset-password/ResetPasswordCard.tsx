import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, CardContent, Input, cn } from "ui";

import { AuthCard } from "../login/AuthCard";

function FieldIcon({
  children,
  side,
}: {
  children: ReactNode;
  side: "left" | "right";
}) {
  return (
    <div
      className={
        side === "left"
          ? "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary/80"
          : "absolute inset-y-0 right-0 flex items-center pr-4"
      }
    >
      {children}
    </div>
  );
}

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { label: "Weak", score: 0, tone: "text-destructive" };
  }

  if (score <= 2) {
    return { label: "Weak", score: 1, tone: "text-destructive" };
  }

  if (score <= 4) {
    return { label: "Medium", score: 2, tone: "text-primary" };
  }

  return { label: "Strong", score: 4, tone: "text-success" };
}

export function ResetPasswordCard() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("New password and confirm password must match.");
      return;
    }

    // TODO: Replace with reset-password API once backend support is available.
    toast.success("Password reset successfully.");
  };

  return (
    <AuthCard>
      <CardContent className="p-5 sm:p-7 lg:p-8 2xl:p-10">
        <form
          className="space-y-4 2xl:space-y-5"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-3 2xl:gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 p-3 text-primary 2xl:size-14">
              <LockKeyhole
                aria-hidden="true"
                className="size-6 2xl:size-7"
                strokeWidth={1.8}
              />
            </span>
            <div>
              <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-secondary sm:text-[1.85rem] 2xl:text-[2.15rem]">
                Reset Password
              </h2>
              <p className="mt-1.5 max-w-[430px] text-sm font-semibold leading-6 text-muted-foreground 2xl:text-base 2xl:leading-7">
                Create a new password for your account. Make sure it&apos;s
                strong and easy for you to remember.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reset-password"
              className="text-sm font-extrabold text-secondary 2xl:text-base"
            >
              New Password
            </label>
            <div className="relative">
              <FieldIcon side="left">
                <LockKeyhole
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.8}
                />
              </FieldIcon>
              <Input
                id="reset-password"
                aria-label="New Password"
                autoComplete="new-password"
                placeholder="Enter new password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white pl-12 pr-12 text-sm font-semibold shadow-none focus-visible:border-primary 2xl:h-12 2xl:text-base"
              />
              <FieldIcon side="right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    showPassword ? "Hide new password" : "Show new password"
                  }
                  className="size-8 rounded-md text-secondary/70 hover:bg-transparent hover:text-secondary"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </Button>
              </FieldIcon>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full bg-slate-200",
                      index < strength.score &&
                        (strength.label === "Strong"
                          ? "bg-success"
                          : strength.label === "Medium"
                          ? "bg-primary"
                          : "bg-destructive"),
                    )}
                  />
                ))}
              </div>
              <p className="text-xs font-extrabold text-muted-foreground">
                Password Strength:{" "}
                <span className={strength.tone}>{strength.label}</span>
              </p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Use 8+ characters with a mix of letters, numbers & symbols.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-reset-password"
              className="text-sm font-extrabold text-secondary 2xl:text-base"
            >
              Confirm Password
            </label>
            <div className="relative">
              <FieldIcon side="left">
                <LockKeyhole
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.8}
                />
              </FieldIcon>
              <Input
                id="confirm-reset-password"
                aria-label="Confirm Password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white pl-12 pr-12 text-sm font-semibold shadow-none focus-visible:border-primary 2xl:h-12 2xl:text-base"
              />
              <FieldIcon side="right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="size-8 rounded-md text-secondary/70 hover:bg-transparent hover:text-secondary"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </Button>
              </FieldIcon>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="relative h-11 w-full rounded-md bg-gradient-to-r from-primary to-primary-hover text-base font-extrabold shadow-none hover:from-primary-hover hover:to-primary 2xl:h-12"
          >
            Reset Password
            <ArrowRight
              aria-hidden="true"
              className="absolute right-5 size-5"
            />
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm font-bold text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            asChild
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-lg border-slate-200 bg-white text-sm font-extrabold text-secondary shadow-none 2xl:h-12 2xl:text-base"
          >
            <Link to="/login">
              <ArrowLeft
                aria-hidden="true"
                className="size-5"
                strokeWidth={1.8}
              />
              Back to Login
            </Link>
          </Button>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 2xl:size-12">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5 2xl:size-6"
                  strokeWidth={1.8}
                />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-secondary 2xl:text-base">
                  Security Tip
                </h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground 2xl:text-sm 2xl:leading-6">
                  Never share your password with anyone. Trueroot Realty will
                  never ask for your password.
                </p>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </AuthCard>
  );
}

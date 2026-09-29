import { useState, type FormEvent, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LockKeyhole,
  Smartphone,
  User,
} from "lucide-react";
import { Button, CardContent, Checkbox, Input } from "ui";

import { LoginSchema } from "../../../common/authSchemas";
import {
  useLoginMutation,
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
} from "../../../common/mutations/useAuthMutations";
import type { AuthTokens, LoginResponse } from "../../../common/authSchemas";
import { OtpVerificationCard } from "../forgot-password/OtpVerificationCard";
import { AuthCard } from "./AuthCard";
import { defaultAuthSupport } from "./AuthLayout";
import { SupportBox } from "./SupportBox";

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

function isAuthTokens(data: LoginResponse): data is AuthTokens {
  return "accessToken" in data && "refreshToken" in data && "user" in data;
}

export function LoginFormCard() {
  const loginMutation = useLoginMutation();
  const requestOtpMutation = useRequestLoginOtpMutation();
  const verifyOtpMutation = useVerifyLoginOtpMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [pendingOtpIdentifier, setPendingOtpIdentifier] = useState("");
  const [pendingOtpDeliveryTarget, setPendingOtpDeliveryTarget] = useState("");
  const [otpTiming, setOtpTiming] = useState({
    expiresInSeconds: 5 * 60,
    resendAfterSeconds: 60,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const identifier = loginId.trim();
    const credentials = LoginSchema.safeParse({
      ...(identifier.includes("@")
        ? { email: identifier }
        : { mobile: identifier }),
      password,
    });

    if (!credentials.success) {
      toast.error("Enter a valid email or mobile number and password.");
      return;
    }

    loginMutation.mutate(
      { credentials: credentials.data, rememberMe },
      {
        onError: (error) => {
          const message = getLoginErrorMessage(error);
          toast.error(message);
        },
        onSuccess: (data) => {
          if ("requiresOtp" in data && data.requiresOtp) {
            setPendingOtpIdentifier(data.identifier);
            setPendingOtpDeliveryTarget(data.deliveryTarget ?? data.identifier);
            setOtpTiming({
              expiresInSeconds: data.expiresInSeconds,
              resendAfterSeconds: data.resendAfterSeconds,
            });
            toast.success("Password verified. Enter the OTP sent to your registered phone.");
            return;
          }

          if (isAuthTokens(data)) {
            const displayName = data.user.fullName || data.user.email;
            toast.success(`Signed in as ${displayName}.`);
            setPassword("");
          }
        },
      },
    );
  };

  const isSubmitting = loginMutation.isPending;

  if (pendingOtpIdentifier) {
    return (
      <OtpVerificationCard
        identifier={pendingOtpIdentifier}
        displayIdentifier={pendingOtpDeliveryTarget || pendingOtpIdentifier}
        title="Two-factor verification"
        descriptionPrefix="We've sent a 6-digit OTP by SMS to"
        expiresInSeconds={otpTiming.expiresInSeconds}
        resendAfterSeconds={otpTiming.resendAfterSeconds}
        isResending={requestOtpMutation.isPending}
        isVerifying={verifyOtpMutation.isPending}
        onChangeIdentifier={() => {
          setPendingOtpIdentifier("");
          setPendingOtpDeliveryTarget("");
          setPassword("");
        }}
        onBackToLogin={() => {
          setPendingOtpIdentifier("");
          setPendingOtpDeliveryTarget("");
          setPassword("");
        }}
        onResend={async () => {
          try {
            const data = await requestOtpMutation.mutateAsync({
              identifier: pendingOtpIdentifier,
            });
            toast.success("OTP resent successfully.");
            setPendingOtpDeliveryTarget(
              data.deliveryTarget ?? pendingOtpDeliveryTarget,
            );
            return {
              expiresInSeconds: data.expiresInSeconds,
              resendAfterSeconds: data.resendAfterSeconds,
            };
          } catch (error) {
            toast.error(getLoginErrorMessage(error));
            return otpTiming;
          }
        }}
        onVerified={(otp) => {
          verifyOtpMutation.mutate(
            {
              payload: { identifier: pendingOtpIdentifier, otp },
              rememberMe,
            },
            {
              onError: (error) => {
                toast.error(getLoginErrorMessage(error));
              },
              onSuccess: (data) => {
                const displayName = data.user.fullName || data.user.email;
                toast.success(`Signed in as ${displayName}.`);
                setPassword("");
                setPendingOtpIdentifier("");
                setPendingOtpDeliveryTarget("");
              },
            },
          );
        }}
      />
    );
  }

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
              <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-secondary sm:text-[1.8rem] 2xl:text-[2rem]">
                Login to Your Account
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-muted-foreground 2xl:text-base">
                Welcome back! Please login to continue.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="login-id"
                className="text-sm font-extrabold text-secondary 2xl:text-base"
              >
                Email or mobile number
              </label>
              <div className="relative">
                <FieldIcon side="left">
                  {loginId.includes("@") ? (
                    <User
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Smartphone
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.8}
                    />
                  )}
                </FieldIcon>
                <Input
                  id="login-id"
                  aria-label="Email or mobile number"
                  autoComplete="username"
                  inputMode="text"
                  placeholder="Enter registered email or mobile number"
                  type="text"
                  value={loginId}
                  disabled={isSubmitting}
                  onChange={(event) => setLoginId(event.target.value)}
                  className="h-11 rounded-lg border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold shadow-none focus-visible:border-primary 2xl:h-12 2xl:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="text-sm font-extrabold text-secondary 2xl:text-base"
              >
                Password
              </label>
              <div className="relative">
                <FieldIcon side="left">
                  <Lock
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.8}
                  />
                </FieldIcon>
                <Input
                  id="login-password"
                  aria-label="Password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  disabled={isSubmitting}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-lg border-slate-200 bg-white pl-12 pr-12 text-sm font-semibold shadow-none focus-visible:border-primary 2xl:h-12 2xl:text-base"
                />
                <FieldIcon side="right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    disabled={isSubmitting}
                    className="size-8 rounded-md text-secondary/70 hover:bg-transparent hover:text-secondary"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeOff
                        aria-hidden="true"
                        className="size-5"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Eye
                        aria-hidden="true"
                        className="size-5"
                        strokeWidth={1.8}
                      />
                    )}
                  </Button>
                </FieldIcon>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Checkbox
              checked={rememberMe}
              disabled={isSubmitting}
              onChange={(event) => setRememberMe(event.target.checked)}
              label="Remember me"
              className="font-semibold"
            />
            <Link
              to="/forgot-password"
              className="text-sm font-extrabold text-info transition-colors hover:text-secondary 2xl:text-base"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="relative h-11 w-full rounded-md bg-gradient-to-r from-primary to-primary-hover text-base font-extrabold hover:from-primary-hover hover:to-primary 2xl:h-12"
          >
            {isSubmitting ? "Signing in..." : "Login"}
            {!isSubmitting ? (
              <ArrowRight
                aria-hidden="true"
                className="absolute right-5 size-5"
              />
            ) : null}
          </Button>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-secondary">
            Enter your password first. If two-factor authentication is enabled
            for your role or employee profile, we will send an SMS OTP before
            signing you in.
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link to="/download-app">Download Android app</Link>
          </Button>

          <SupportBox
            phone={defaultAuthSupport.phone}
            email={defaultAuthSupport.email}
          />
        </form>
      </CardContent>
    </AuthCard>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const dataMessage = (error as any).response?.data?.message;

    if (typeof dataMessage === "string" && dataMessage.trim().length > 0) {
      return dataMessage;
    }

    if (Array.isArray(dataMessage) && typeof dataMessage[0] === "string") {
      return dataMessage[0];
    }

    const message = (error as any).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "Unable to sign in. Check your credentials and try again.";
}

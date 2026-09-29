import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Mail,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, CardContent, Input, cn } from "ui";

import { AuthCard } from "../login/AuthCard";
import { defaultAuthSupport } from "../login/AuthLayout";
import { SupportBox } from "../login/SupportBox";

interface OtpVerificationCardProps {
  identifier: string;
  displayIdentifier?: string;
  onChangeIdentifier: () => void;
  onBackToLogin?: () => void;
  onVerified: (otp: string) => void;
  onResend?: () => Promise<{
    expiresInSeconds: number;
    resendAfterSeconds: number;
  }>;
  title?: string;
  descriptionPrefix?: string;
  expiresInSeconds?: number;
  resendAfterSeconds?: number;
  isVerifying?: boolean;
  isResending?: boolean;
}

export function OtpVerificationCard({
  identifier,
  displayIdentifier,
  onChangeIdentifier,
  onBackToLogin,
  onVerified,
  onResend,
  title = "OTP Verification",
  descriptionPrefix = "We've sent a 6-digit OTP to your registered email",
  expiresInSeconds = 5 * 60,
  resendAfterSeconds = 60,
  isVerifying = false,
  isResending = false,
}: OtpVerificationCardProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [expirySeconds, setExpirySeconds] = useState(expiresInSeconds);
  const [resendSeconds, setResendSeconds] = useState(resendAfterSeconds);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const maskedIdentifier =
    displayIdentifier?.trim() ||
    identifier.trim() ||
    "amit.kumar@truerootrealty.com";

  useEffect(() => {
    setExpirySeconds(expiresInSeconds);
  }, [expiresInSeconds]);

  useEffect(() => {
    setResendSeconds(resendAfterSeconds);
  }, [resendAfterSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpirySeconds((value) => Math.max(0, value - 1));
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < otp.length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");

    if (!pastedDigits.length) {
      return;
    }

    const nextOtp = Array.from(
      { length: 6 },
      (_, index) => pastedDigits[index] ?? "",
    );
    setOtp(nextOtp);
    focusInput(Math.min(pastedDigits.length, 6) - 1);
  };

  const handleVerify = () => {
    const code = otp.join("");

    if (code.length !== 6) {
      toast.error("Enter the complete 6-digit OTP.");
      return;
    }

    // TODO: Replace with verify-password-reset OTP API once backend support is available.
    onVerified(code);
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || !onResend) return;

    const result = await onResend();
    setOtp(["", "", "", "", "", ""]);
    setExpirySeconds(result.expiresInSeconds);
    setResendSeconds(result.resendAfterSeconds);
    focusInput(0);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  return (
    <AuthCard>
      <CardContent className="p-5 sm:p-7 lg:p-8 2xl:p-10">
        <div className="space-y-4 2xl:space-y-5">
          <div className="flex items-center gap-3 2xl:gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 p-3 text-primary 2xl:size-14">
              <MailCheck
                aria-hidden="true"
                className="size-6 2xl:size-7"
                strokeWidth={1.8}
              />
            </span>
            <div>
              <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-secondary sm:text-[1.85rem] 2xl:text-[2.15rem]">
                {title}
              </h2>
              <p className="mt-1.5 max-w-[430px] text-sm font-semibold leading-6 text-muted-foreground 2xl:text-base 2xl:leading-7">
                {descriptionPrefix}{" "}
                <span className="font-extrabold text-secondary">
                  {maskedIdentifier}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-extrabold text-secondary 2xl:text-base">
              Enter the 6-digit code
            </p>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  aria-label={`OTP digit ${index + 1}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  className={cn(
                    "h-12 rounded-lg border-slate-200 p-0 text-center text-xl font-extrabold text-secondary shadow-none focus-visible:border-info 2xl:h-14",
                    index === 0 && !digit && "border-info ring-2 ring-info/20",
                  )}
                  onChange={(event) =>
                    handleOtpChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-secondary">
            <Info
              aria-hidden="true"
              className="size-5 shrink-0 text-info"
              strokeWidth={1.8}
            />
            <span>
              OTP will expire in{" "}
              <span className="text-primary">
                {formatDuration(expirySeconds)}
              </span>
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto justify-start gap-3 px-0 py-0 text-sm font-bold text-muted-foreground hover:bg-transparent hover:text-secondary"
            disabled={resendSeconds > 0 || isResending}
            onClick={handleResend}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            <span>
              {resendSeconds > 0
                ? `Resend OTP in ${formatDuration(resendSeconds)}`
                : isResending
                  ? "Resending OTP..."
                  : "Resend OTP"}
            </span>
          </Button>

          <Button
            type="button"
            size="lg"
            disabled={isVerifying}
            className="relative h-11 w-full rounded-md bg-gradient-to-r from-primary to-primary-hover text-base font-extrabold shadow-none hover:from-primary-hover hover:to-primary 2xl:h-12"
            onClick={handleVerify}
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
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
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-lg border-slate-200 bg-white text-sm font-extrabold text-secondary shadow-none 2xl:h-12 2xl:text-base"
            onClick={onChangeIdentifier}
          >
            <Mail aria-hidden="true" className="size-5" strokeWidth={1.8} />
            Change Email / Mobile Number
          </Button>

          {onBackToLogin ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-lg border-slate-200 bg-white text-sm font-extrabold text-secondary shadow-none 2xl:h-12 2xl:text-base"
              onClick={onBackToLogin}
            >
              <ArrowLeft
                aria-hidden="true"
                className="size-5"
                strokeWidth={1.8}
              />
              Back to Login
            </Button>
          ) : (
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
          )}

          <SupportBox
            phone={defaultAuthSupport.phone}
            email={defaultAuthSupport.email}
          />
        </div>
      </CardContent>
    </AuthCard>
  );
}

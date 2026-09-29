import { useState, type FormEvent, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft, ArrowRight, Info, Smartphone, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, CardContent, Input } from "ui";

import {
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
} from "../../../common/mutations/useAuthMutations";
import { AuthCard } from "../login/AuthCard";
import { defaultAuthSupport } from "../login/AuthLayout";
import { SupportBox } from "../login/SupportBox";
import { OtpVerificationCard } from "../forgot-password/OtpVerificationCard";

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary/80">
      {children}
    </div>
  );
}

export function LoginOtpCard() {
  const requestOtpMutation = useRequestLoginOtpMutation();
  const verifyOtpMutation = useVerifyLoginOtpMutation();
  const [identifier, setIdentifier] = useState("");
  const [showOtpCard, setShowOtpCard] = useState(false);
  const [otpTiming, setOtpTiming] = useState({
    expiresInSeconds: 5 * 60,
    resendAfterSeconds: 60,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim()) {
      toast.error("Enter your email or mobile number to receive OTP.");
      return;
    }

    requestOtpMutation.mutate(
      { identifier },
      {
        onError: (error) => {
          toast.error(getOtpErrorMessage(error, "Unable to send OTP."));
        },
        onSuccess: (data) => {
          setOtpTiming({
            expiresInSeconds: data.expiresInSeconds,
            resendAfterSeconds: data.resendAfterSeconds,
          });
          toast.success("OTP sent successfully.");
          setShowOtpCard(true);
        },
      },
    );
  };

  if (showOtpCard) {
    return (
      <OtpVerificationCard
        identifier={identifier}
        title="Login OTP Verification"
        descriptionPrefix="We've sent a 6-digit login OTP to"
        expiresInSeconds={otpTiming.expiresInSeconds}
        resendAfterSeconds={otpTiming.resendAfterSeconds}
        isResending={requestOtpMutation.isPending}
        isVerifying={verifyOtpMutation.isPending}
        onChangeIdentifier={() => setShowOtpCard(false)}
        onResend={async () => {
          try {
            const data = await requestOtpMutation.mutateAsync({ identifier });
            toast.success("OTP resent successfully.");
            return {
              expiresInSeconds: data.expiresInSeconds,
              resendAfterSeconds: data.resendAfterSeconds,
            };
          } catch (error) {
            toast.error(getOtpErrorMessage(error, "Unable to resend OTP."));
            return otpTiming;
          }
        }}
        onVerified={(otp) => {
          verifyOtpMutation.mutate(
            { payload: { identifier, otp } },
            {
              onError: (error) => {
                toast.error(
                  getOtpErrorMessage(error, "Unable to verify OTP."),
                );
              },
              onSuccess: (data) => {
                const displayName = data.user.fullName || data.user.email;
                toast.success(`Signed in as ${displayName}.`);
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
              <Smartphone
                aria-hidden="true"
                className="size-6 2xl:size-7"
                strokeWidth={1.8}
              />
            </span>
            <div>
              <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-secondary sm:text-[1.8rem] 2xl:text-[2rem]">
                Login with OTP
              </h2>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-muted-foreground 2xl:text-base">
                Enter your email or mobile number and we&apos;ll send you a
                secure one-time password.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-otp-identifier"
              className="text-sm font-extrabold text-secondary 2xl:text-base"
            >
              Email or Mobile Number
            </label>
            <div className="relative">
              <FieldIcon>
                <User aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </FieldIcon>
              <Input
                id="login-otp-identifier"
                aria-label="Email or Mobile Number"
                autoComplete="username"
                placeholder="Enter email or mobile number"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold shadow-none focus-visible:border-primary 2xl:h-12 2xl:text-base"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-secondary">
            <Info
              aria-hidden="true"
              className="size-5 shrink-0 text-info"
              strokeWidth={1.8}
            />
            <span>We&apos;ll send an OTP to verify your login.</span>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={requestOtpMutation.isPending}
            className="relative h-11 w-full rounded-md bg-gradient-to-r from-primary to-primary-hover text-base font-extrabold shadow-none hover:from-primary-hover hover:to-primary 2xl:h-12"
          >
            {requestOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
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

          <SupportBox
            phone={defaultAuthSupport.phone}
            email={defaultAuthSupport.email}
          />
        </form>
      </CardContent>
    </AuthCard>
  );
}

function getOtpErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message) && typeof message[0] === "string") {
      return message[0];
    }
  }

  return fallback;
}

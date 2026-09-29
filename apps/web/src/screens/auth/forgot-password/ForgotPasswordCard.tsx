import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Info, LockKeyhole, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, CardContent, Input } from "ui";

import { AuthCard } from "../login/AuthCard";
import { defaultAuthSupport } from "../login/AuthLayout";
import { SupportBox } from "../login/SupportBox";
import { ResetPasswordCard } from "../reset-password/ResetPasswordCard";
import { OtpVerificationCard } from "./OtpVerificationCard";

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary/80">
      {children}
    </div>
  );
}

export function ForgotPasswordCard() {
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"request" | "otp" | "reset">("request");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim()) {
      setStep("request");
      toast.error("Enter your registered email or mobile number.");
      return;
    }

    // TODO: Replace with forgot-password API once backend support is available.
    toast.success("OTP sent successfully.");
    setStep("otp");
  };

  if (step === "otp") {
    return (
      <OtpVerificationCard
        identifier={identifier}
        onChangeIdentifier={() => {
          setStep("request");
        }}
        onVerified={() => setStep("reset")}
      />
    );
  }

  if (step === "reset") {
    return <ResetPasswordCard />;
  }

  return (
    <AuthCard>
      <CardContent className="p-5 sm:p-7 lg:p-8 2xl:p-10">
        <form
          className="space-y-4 2xl:space-y-5"
          noValidate
          onSubmit={handleSubmit}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 p-3 text-primary 2xl:size-14">
                <LockKeyhole
                  aria-hidden="true"
                  className="size-6 2xl:size-7"
                  strokeWidth={1.8}
                />
              </span>
              <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-secondary sm:text-[1.85rem] 2xl:text-[2.15rem]">
                Forgot Password?
              </h2>
            </div>
            <p className="mt-2 max-w-[460px] text-sm font-semibold leading-6 text-muted-foreground 2xl:text-base 2xl:leading-7">
              No worries! Enter your registered email or mobile number and
              we&apos;ll send you a One-Time Password (OTP) to reset your
              password.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="forgot-identifier"
              className="text-sm font-extrabold text-secondary 2xl:text-base"
            >
              Email or Mobile Number
            </label>
            <div className="relative">
              <FieldIcon>
                <User aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </FieldIcon>
              <Input
                id="forgot-identifier"
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
            <span>We&apos;ll send an OTP to verify your identity.</span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="relative h-11 w-full rounded-md bg-gradient-to-r from-primary to-primary-hover text-base font-extrabold shadow-none hover:from-primary-hover hover:to-primary 2xl:h-12"
          >
            Send OTP
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

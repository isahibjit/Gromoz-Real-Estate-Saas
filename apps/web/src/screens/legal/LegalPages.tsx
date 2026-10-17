import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, ShieldCheck } from "lucide-react";

import trurootLogo from "../../assets/truroot-logo.png";

const SUPPORT_EMAIL = "support@gromoze.com";
const SUPPORT_PHONE = "+91 98700 66177";
const EFFECTIVE_DATE = "11 August 2026";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  eyebrow: string;
  intro: string;
  sections: LegalSection[];
}

const privacySections: LegalSection[] = [
  {
    title: "Information we collect",
    body: [
      "We collect CRM account details for authorized users, including name, email address, phone number, role, team, attendance, payroll, task, and access-control information.",
      "When leads are submitted through connected sources such as Meta Lead Ads, MagicBricks, 99acres, imports, or manual entry, we may receive customer details such as name, phone number, email address, project interest, source, campaign metadata, remarks, and follow-up requirements.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use CRM data to manage leads, follow-ups, calls, site visits, bookings, employee tasks, reports, payroll, incentives, and customer communication.",
      "Meta Lead Ads data is retrieved only after a person submits an authorized lead form and is used to create or update CRM leads for sales follow-up.",
    ],
  },
  {
    title: "Sharing and disclosure",
    body: [
      "We do not sell personal information. Information is shared only with authorized CRM users, service providers, and integrations needed to operate the CRM and support customer follow-up.",
      "Access to CRM data is role-based. Admins can configure module access, field visibility, and operational permissions for employees.",
    ],
  },
  {
    title: "Retention and security",
    body: [
      "We retain business records for operational, audit, legal, and reporting requirements. Deleted leads may be retained in recovery workflows unless permanently removed by an authorized administrator.",
      "We use access controls, authentication, audit trails, and operational safeguards to reduce unauthorized access or misuse.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "Customers can contact us to request corrections, updates, or removal of their lead information where applicable.",
      "CRM users should contact their administrator for account access, role permissions, or employee-profile changes.",
    ],
  },
];

const termsSections: LegalSection[] = [
  {
    title: "Authorized use",
    body: [
      "The CRM is intended for authorized employees, administrators, and business users of Truroot Realty and its permitted operating teams.",
      "Users must access only the modules, leads, employee records, reports, and tools assigned to them through their role or explicit permissions.",
    ],
  },
  {
    title: "Account responsibility",
    body: [
      "Users are responsible for keeping login credentials, OTPs, and devices secure. Shared accounts, unauthorized access, and misuse of customer data are not allowed.",
      "Administrators may suspend, restrict, or audit access when required for security, compliance, or operational reasons.",
    ],
  },
  {
    title: "Lead and customer data",
    body: [
      "Users must handle lead and customer information only for legitimate CRM activities such as follow-up, site visits, bookings, reporting, and support.",
      "Imported or integrated data, including Meta Lead Ads data, must be mapped and processed according to the customer consent and source rules applicable to that lead.",
    ],
  },
  {
    title: "Third-party integrations",
    body: [
      "The CRM may connect to third-party services such as Meta, MagicBricks, 99acres, SMS providers, maps, email, and messaging platforms.",
      "Availability and behavior of third-party services depend on their own platforms, permissions, APIs, and policies.",
    ],
  },
  {
    title: "Operational changes",
    body: [
      "CRM features, access rules, reports, integrations, and workflows may be updated to meet business, legal, or platform requirements.",
      "Continued use of the CRM after updates means users accept the updated operating terms.",
    ],
  },
];

function LegalPage({ title, eyebrow, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#062b4f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={trurootLogo}
              alt="Truroot Realty"
              className="h-14 w-auto object-contain"
            />
            <div className="h-12 w-px bg-slate-200" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-primary">{eyebrow}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#062b4f]">
                {title}
              </h1>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#062b4f] transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to login
          </Link>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Effective {EFFECTIVE_DATE}
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              {intro}
            </p>
          </div>

          <div className="grid gap-5 p-6">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-md border border-slate-200 bg-slate-50 p-5"
              >
                <h2 className="text-lg font-bold text-[#062b4f]">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <footer className="border-t border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-[#062b4f]">
              Contact for privacy, terms, or CRM data requests
            </p>
            <div className="mt-3 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-6">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 font-semibold text-[#062b4f] hover:text-primary"
              >
                <Mail className="size-4" aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 font-semibold text-[#062b4f] hover:text-primary"
              >
                <Phone className="size-4" aria-hidden="true" />
                {SUPPORT_PHONE}
              </a>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      intro="This privacy policy explains how Truroot Realty CRM collects, uses, protects, and manages information processed through the CRM, including leads received from connected channels such as Meta Lead Ads."
      sections={privacySections}
    />
  );
}

export function TermsOfUsePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      intro="These terms define the acceptable use of Truroot Realty CRM by authorized users and describe responsibilities around CRM access, lead handling, employee data, and third-party integrations."
      sections={termsSections}
    />
  );
}

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, Check, Copy, Smartphone } from "lucide-react";
import { Badge, Button, Card, Input } from "ui";
import truerootLogo from "../../assets/truroot-logo.png";
import { formatApkSize, formatReleaseDate, mobileAppApiBase, usePublishedMobileApp } from "../../common/mobileApp";

export function DownloadAppScreen() {
  const query = usePublishedMobileApp();
  const release = query.data?.release;
  const [copyState, setCopyState] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const landingUrl = `${window.location.origin}/download-app`;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  async function copyLink() {
    try { await navigator.clipboard.writeText(landingUrl); setCopyState("Link copied. Open it on your Android phone."); }
    catch { linkInput.current?.focus(); linkInput.current?.select(); setCopyState("Copy the selected link and open it on your Android phone."); }
  }

  return <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><Link to="/login" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={truerootLogo} alt="Trueroot Realty" className="h-12 w-auto max-w-40 object-contain" /></Link><Button variant="outline" asChild><Link to="/login">Open web CRM <ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div></header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <section className="space-y-6 lg:pt-6"><h1 className="max-w-lg text-4xl font-extrabold leading-tight text-secondary sm:text-5xl">Your CRM.<br />Ready to go.</h1><p className="max-w-md text-lg leading-relaxed text-muted-foreground">Download the Trueroot Realty Android app and sign in with your existing CRM account.</p><p className="max-w-md text-sm leading-relaxed text-muted-foreground">A direct APK download for your Android phone. No new account needed. Using an iPhone? Continue with the web CRM.</p>
          <div className="space-y-3 border-t border-border pt-6"><label htmlFor="download-page-link" className="block text-sm font-bold">On a computer? Take this link with you.</label><div className="flex flex-wrap gap-2"><Input ref={linkInput} id="download-page-link" readOnly value={landingUrl} className="min-w-0 flex-1" /><Button onClick={() => void copyLink()} variant="outline"><Copy className="size-4" aria-hidden="true" />Copy link</Button></div><p role="status" className="min-h-5 text-xs text-muted-foreground">{copyState || "Open this page on your Android phone to download the APK."}</p></div>
        </section>
        <Card className="overflow-hidden shadow-sm">
          <div className="flex items-center gap-4 bg-secondary p-6 text-secondary-foreground"><Smartphone className="size-8 shrink-0" aria-hidden="true" /><div><h2 className="text-xl font-bold">Trueroot for Android</h2><p className="mt-1 text-sm text-secondary-foreground/80">Direct download from your CRM</p></div></div>
          <div className="space-y-6 p-6 sm:p-8">
            {query.isPending ? <p role="status" className="py-8 text-muted-foreground">Checking the latest release...</p> : query.isError ? <div role="alert" className="space-y-4"><h3 className="font-bold">We couldn't load the download</h3><p className="text-sm text-muted-foreground">Please try again. You can still sign in to the web CRM.</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>Try again</Button></div> : !release ? <div className="space-y-4 py-4"><h3 className="text-lg font-bold">The Android app download is not available yet</h3><p className="text-sm leading-relaxed text-muted-foreground">Your administrator has not published a release. Please check back later or use the web CRM.</p><Button asChild variant="outline"><Link to="/login">Go to login</Link></Button></div> : <>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xl font-extrabold">Version {release.versionName}</p><Badge variant="success">Published release</Badge></div>
              <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Download size</dt><dd className="mt-1 font-bold">{formatApkSize(release.sizeBytes)}</dd></div><div><dt className="text-muted-foreground">Build</dt><dd className="mt-1 font-bold">{release.buildNumber}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Published</dt><dd className="mt-1 font-bold">{formatReleaseDate(release.publishedAt ?? release.createdAt)}</dd></div></dl>
              {isIos ? <div className="space-y-3 rounded-lg bg-muted p-4"><p className="text-sm">This APK is for Android only and cannot be installed on an iPhone or iPad.</p><Button asChild variant="outline"><Link to="/login">Open web CRM</Link></Button></div> : <div className="space-y-3"><Button size="lg" asChild className="w-full"><a href={`${mobileAppApiBase}/download`}><ArrowDownToLine className="size-5" aria-hidden="true" />Download Android APK</a></Button><p className="text-center text-xs text-muted-foreground">Android only. An existing CRM account is required.</p></div>}
              {release.releaseNotes && <div className="border-t border-border pt-5"><h3 className="mb-2 font-bold">What's new</h3><p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{release.releaseNotes}</p></div>}
              <details className="border-t border-border pt-4 text-xs text-muted-foreground"><summary className="cursor-pointer rounded py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">File checksum (SHA-256)</summary><code className="mt-3 block break-all">{release.sha256}</code></details>
            </>}
          </div>
        </Card>
      </div>
      <section className="mt-12 border-t border-border pt-8 sm:mt-16" aria-labelledby="install-title"><h2 id="install-title" className="text-2xl font-extrabold text-secondary">From download to sign-in</h2><ol className="mt-6 grid list-inside list-decimal gap-6 text-sm sm:grid-cols-2 lg:grid-cols-4"><li className="space-y-2 font-bold">Download the APK<p className="font-normal leading-relaxed text-muted-foreground">Use the download button on your Android phone.</p></li><li className="space-y-2 font-bold">Open the file<p className="font-normal leading-relaxed text-muted-foreground">Find the APK in your browser downloads or Files app.</p></li><li className="space-y-2 font-bold">Allow this source if asked<p className="font-normal leading-relaxed text-muted-foreground">Android may ask you to allow installation from the browser or file manager you used. Keep Play Protect enabled.</p></li><li className="space-y-2 font-bold">Sign in to Trueroot<p className="font-normal leading-relaxed text-muted-foreground">Open the installed app and use your existing CRM credentials.</p></li></ol></section>
      <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Check className="size-4 shrink-0" aria-hidden="true" />Only install APKs you trust. If Android reports a security or compatibility issue, stop and contact your administrator.</p>
    </main>
    <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">Trueroot Realty / Android app download</footer>
  </div>;
}

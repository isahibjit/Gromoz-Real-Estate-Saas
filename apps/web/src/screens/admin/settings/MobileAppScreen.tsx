import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isCancel } from "axios";
import { Link } from "react-router-dom";
import { ExternalLink, FileUp, Smartphone, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Progress, Textarea, type ColumnDef } from "ui";
import { api } from "../../../common/api";
import { getApiErrorMessage } from "../../../common/apiError";
import { canAccess } from "../../../common/access/access";
import { useAppSelector } from "../../../store";
import { formatApkSize, formatReleaseDate, maxApkBytes, mobileAppQueryKey, releaseHistoryKey, type MobileAppRelease, type ReleaseHistory } from "../../../common/mobileApp";

function ReleaseDetails({ release }: { release: MobileAppRelease }) {
  return <div className="space-y-4 text-sm">
    <dl className="grid grid-cols-2 gap-4">
      <div><dt className="text-muted-foreground">Version</dt><dd className="font-bold">{release.versionName}</dd></div>
      <div><dt className="text-muted-foreground">Build number</dt><dd className="font-bold">{release.buildNumber}</dd></div>
      <div><dt className="text-muted-foreground">File size</dt><dd>{formatApkSize(release.sizeBytes)}</dd></div>
      <div><dt className="text-muted-foreground">Uploaded</dt><dd>{formatReleaseDate(release.createdAt)}</dd></div>
    </dl>
    <div><p className="text-muted-foreground">Original file</p><p className="break-all">{release.originalName}</p></div>
    <div><p className="text-muted-foreground">SHA-256 checksum</p><code className="block break-all text-xs">{release.sha256}</code></div>
    <div><p className="mb-1 font-bold">Release notes</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{release.releaseNotes || "No release notes added."}</p></div>
  </div>;
}

function UploadReleaseDialog({ onClose, onUploaded }: { onClose: () => void; onUploaded: (release: MobileAppRelease) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [build, setBuild] = useState("");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    if (!file || !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,179}\.apk$/i.test(file.name) || file.name.includes("..") || !file.size || file.size > maxApkBytes) {
      setError("Choose an APK up to 200 MiB with a simple filename."); return;
    }
    if (!/^[1-9]\d*$/.test(build) || Number(build) > 2147483647) { setError("Enter a positive whole build number up to 2147483647."); return; }
    const abort = new AbortController();
    controller.current = abort;
    setUploading(true); setError(""); setProgress(0);
    const form = new FormData();
    form.append("versionName", version.trim()); form.append("buildNumber", build);
    form.append("releaseNotes", notes); form.append("file", file);
    try {
      const response = await api.post<MobileAppRelease>("/mobile-app/releases", form, {
        signal: abort.signal, timeout: 10 * 60 * 1000,
        onUploadProgress: event => { if (event.total) setProgress(Math.round(event.loaded * 100 / event.total)); },
      });
      onUploaded(response.data);
    } catch (failure) {
      if (isCancel(failure)) setError("Upload cancelled. No release was published. Refresh history before retrying if cancellation happened after processing.");
      else setError(getApiErrorMessage(failure, "Upload failed. Check release history before retrying."));
    } finally { controller.current = null; setUploading(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !uploading) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!uploading}>
      <DialogHeader><DialogTitle>Upload Android release</DialogTitle><DialogDescription>This creates a private draft. Review it before publishing.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><label htmlFor="release-apk" className="text-sm font-bold">Signed APK file</label>
          <Input id="release-apk" type="file" accept=".apk,application/vnd.android.package-archive" required disabled={uploading} onChange={event => setFile(event.target.files?.[0] ?? null)} className="h-auto py-3" aria-describedby="apk-help" />
          <p id="apk-help" className="text-xs text-muted-foreground">APK only, up to 200 MiB.{file ? ` Selected: ${formatApkSize(file.size)}.` : ""}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="release-version" className="text-sm font-bold">Version name</label><Input id="release-version" value={version} onChange={event => setVersion(event.target.value)} required maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9.+_\-]{0,63}" placeholder="e.g. 1.2.0" disabled={uploading} /></div>
          <div className="space-y-2"><label htmlFor="release-build" className="text-sm font-bold">Build number</label><Input id="release-build" type="number" min={1} max={2147483647} step={1} value={build} onChange={event => setBuild(event.target.value)} required placeholder="e.g. 12" disabled={uploading} /></div>
        </div>
        <div className="space-y-2"><label htmlFor="release-notes" className="text-sm font-bold">Release notes <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="release-notes" rows={4} maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} disabled={uploading} placeholder="What changed in this release?" /><p className="text-xs text-muted-foreground">Plain text. These notes will be public after publishing.</p></div>
        <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">Use your signed production APK. Version and build are entered manually. Archive validation does not verify the signing identity or guarantee malware safety.</p>
        {uploading && <div role="status" className="space-y-2"><Progress value={progress} aria-label="APK upload progress" /><p className="text-sm text-muted-foreground">{progress < 100 ? `Uploading ${progress}%` : "Validating archive and saving to private storage..."}</p></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => uploading ? controller.current?.abort() : onClose()}>{uploading ? "Cancel upload" : "Cancel"}</Button><Button type="submit" disabled={uploading}><Upload className="size-4" aria-hidden="true" />{uploading ? "Uploading..." : "Upload draft"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function MobileAppScreen() {
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [review, setReview] = useState<MobileAppRelease | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const user = useAppSelector(state => state.auth.user);
  const canManage = user?.role === "SUPER_ADMIN";
  const canUpload = canManage && canAccess(user, "mobile_app", "create");
  const canPublish = canManage && canAccess(user, "mobile_app", "update");
  const cache = useQueryClient();
  const history = useQuery({ queryKey: [...releaseHistoryKey, page], queryFn: async ({ signal }) => (await api.get<ReleaseHistory>("/mobile-app/releases", { params: { page, limit: 10 }, signal })).data, enabled: canManage });
  const refresh = () => Promise.all([cache.invalidateQueries({ queryKey: releaseHistoryKey }), cache.invalidateQueries({ queryKey: mobileAppQueryKey })]);
  const changePublication = useMutation({
    mutationFn: (id: string | null) => {
      if (!canManage) throw new Error("Only platform super administrators can manage app releases");
      return id ? api.post(`/mobile-app/releases/${id}/publish`) : api.post("/mobile-app/unpublish");
    },
    onSuccess: async (_response, id) => { setReview(null); setUnpublishing(false); toast.success(id ? "Release published" : "Public downloads disabled"); await refresh(); },
  });
  const current = history.data?.currentRelease;
  const columns: ColumnDef<ReleaseHistory["data"][number]>[] = [
    { header: "Version", cell: row => <span className="font-bold">{row.versionName}</span> },
    { header: "Build", accessorKey: "buildNumber" },
    { header: "File size", cell: row => formatApkSize(row.sizeBytes) },
    { header: "Uploaded", cell: row => formatReleaseDate(row.createdAt) },
    { header: "State", cell: row => <Badge variant={row.state === "published" ? "success" : "neutral"}>{row.state === "published" ? "Published" : row.state === "previous" ? "Previously published" : "Draft"}</Badge> },
    { header: "Action", cell: row => <Button variant="outline" size="sm" onClick={() => { changePublication.reset(); setReview(row); }} aria-label={`Review version ${row.versionName}, build ${row.buildNumber}`}>Review</Button> },
  ];
  if (!canManage) return <p role="alert">App release management is available to platform super administrators only.</p>;
  return <section className="space-y-5 text-foreground">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-secondary">Mobile app</h1><p className="mt-1 text-sm text-muted-foreground">Upload, review and publish your Android app. Only one release is available to download at a time.</p></div><div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/download-app" target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden="true" />Download page</Link></Button><Button disabled={!canUpload} onClick={() => setUploadOpen(true)}><FileUp className="size-4" aria-hidden="true" />Upload APK</Button></div></header>
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><Smartphone className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="text-lg font-bold">Current release</h2><p className="mt-1 text-sm text-muted-foreground">{history.isPending ? "Checking publication status..." : history.isError ? "Publication status could not be loaded." : current ? `Version ${current.versionName} / Build ${current.buildNumber}` : "No release is published. Upload a draft to get started."}</p></div></div>{current && <Badge variant="success">Available to download</Badge>}</div>
      {current && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"><p className="text-sm text-muted-foreground">{formatApkSize(current.sizeBytes)} / Published {formatReleaseDate(current.publishedAt ?? current.createdAt)}</p><Button variant="outline" disabled={!canPublish || history.isError} onClick={() => { changePublication.reset(); setUnpublishing(true); }}>Unpublish</Button></div>}
    </Card>
    {history.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/20 bg-card p-4"><p className="text-sm text-destructive">{getApiErrorMessage(history.error, "Could not load releases.")}</p><Button variant="outline" onClick={() => void history.refetch()}>Retry</Button></div>}
    <div className="space-y-3"><div><h2 className="text-lg font-bold">Release history</h2><p className="text-sm text-muted-foreground">Drafts stay private. Previous releases are retained for rollback.</p></div><DataTable columns={columns} data={history.data?.data ?? []} isLoading={history.isPending} emptyMessage={history.isError ? "Release history unavailable." : "No APK releases uploaded yet."} minHeight="min-h-64" skeletonRowCount={4} />
      <nav aria-label="Release history pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-muted-foreground">{history.data ? `${history.data.meta.total} releases / Page ${page} of ${Math.max(1, Math.ceil(history.data.meta.total / 10))}` : ""}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || history.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={!history.data || page * 10 >= history.data.meta.total || history.isFetching} onClick={() => setPage(page + 1)}>Next</Button></div></nav>
    </div>
    {uploadOpen && <UploadReleaseDialog onClose={() => setUploadOpen(false)} onUploaded={release => { setUploadOpen(false); setPage(1); changePublication.reset(); setReview(release); void refresh(); }} />}
    <Dialog open={Boolean(review) || unpublishing} onOpenChange={open => { if (!open && !changePublication.isPending) { setReview(null); setUnpublishing(false); } }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!changePublication.isPending}>
        <DialogHeader><DialogTitle>{unpublishing ? "Disable public downloads?" : "Review release"}</DialogTitle><DialogDescription>{unpublishing ? "The download page will show an unavailable message. Stored APKs are kept so you can publish again later." : "Confirm the version, build and release notes before making this APK public."}</DialogDescription></DialogHeader>
        {review && <><ReleaseDetails release={review} /><p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">Publishing replaces the current download immediately. {review.publishedAt ? "This is a rollback. Android may not allow downgrading an installed app. " : ""}Confirm this is your signed release build; archive validation is not a security scan.</p></>}
        {changePublication.isError && <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(changePublication.error, "Publication failed. Refresh to check the current release before retrying.")}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={changePublication.isPending} onClick={() => { setReview(null); setUnpublishing(false); }}>Close</Button><Button disabled={!canPublish || changePublication.isPending || (!unpublishing && (!review || review.id === current?.id))} onClick={() => changePublication.mutate(unpublishing ? null : review!.id)}>{changePublication.isPending ? "Saving..." : unpublishing ? "Unpublish" : review?.id === current?.id ? "Currently published" : review?.publishedAt ? "Confirm rollback" : "Publish release"}</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}

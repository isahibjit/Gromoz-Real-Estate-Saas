import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "ui";

import { api } from "../../../common/api";

export type AttendanceLocationData = {
  checkInLocationAddress?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
};

type AttendanceSelfieCaptureDialogProps = {
  mode: "punchIn" | "punchOut";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (
    imageUrl: string,
    locationData?: AttendanceLocationData,
    note?: string,
  ) => void;
  isSubmitting?: boolean;
};

function getUploadErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return "Unable to upload the attendance selfie.";
}

export function AttendanceSelfieCaptureDialog({
  mode,
  open,
  onOpenChange,
  onSuccess,
  isSubmitting = false,
}: AttendanceSelfieCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [locationData, setLocationData] = useState<AttendanceLocationData>({});
  const [note, setNote] = useState("");
  const isPunchOut = mode === "punchOut";
  const actionLabel = isPunchOut ? "punch out" : "punch in";

  const pending = isSubmitting || isUploading;
  const isPreviewMode = Boolean(capturedDataUrl);
  const dialogStatusLabel = isPreviewMode ? "Review capture" : "Live camera";
  const dialogStatusVariant = cameraError
    ? "danger"
    : isPreviewMode
      ? "success"
      : "info";

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported on this device.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraError(null);
      setIsCameraReady(true);
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : `Camera permission is required to ${actionLabel}.`,
      );
    }
  }, [actionLabel]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setCapturedDataUrl(null);
      setCameraError(null);
      setLocationData({});
      setNote("");
      return;
    }

    void startCamera();

    if (!isPunchOut && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { "Accept-Language": "en" } },
            );
            if (res.ok) {
              const data = (await res.json()) as { display_name?: string };
              if (data.display_name) {
                const parts = String(data.display_name).split(", ");
                address = parts.slice(0, 3).join(", ");
              }
            }
          } catch {
            // fallback
          }
          setLocationData({
            checkInLocationAddress: address,
            checkInLatitude: lat,
            checkInLongitude: lng,
          });
        },
        (err) => {
          console.warn("Location permission error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }

    return () => {
      stopStream();
    };
  }, [isPunchOut, open, startCamera, stopStream]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    stopStream();
  };

  const retake = async () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    setIsCameraReady(false);
    stopStream();
    await startCamera();
  };

  const imageFile = useMemo(() => {
    if (!capturedDataUrl) return null;
    const [header, content] = capturedDataUrl.split(",");
    if (!header || !content) return null;
    const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], `attendance-${mode}-selfie-${Date.now()}.jpg`, {
      type: mime,
    });
  }, [capturedDataUrl, mode]);

  const confirmCapture = async () => {
    if (!imageFile) {
      toast.error("Capture your selfie before confirming.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const uploadRes = await api.post<{ url: string }>("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess(uploadRes.data.url, locationData, note.trim() || undefined);
    } catch (error: unknown) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[960px] gap-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(180deg,#fbfdff,#f7f9fc)] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={dialogStatusVariant}
                  className="border-0 px-3 py-1 text-[11px] font-extrabold"
                >
                  {dialogStatusLabel}
                </Badge>
                <Badge
                  variant="neutral"
                  className="border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-600"
                >
                  {isPunchOut ? "Punch-out required" : "Punch-in required"}
                </Badge>
              </div>
              <DialogTitle className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0e315f]">
                Capture {isPunchOut ? "punch-out" : "punch-in"} selfie
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Take a clear front-camera photo, review it, and confirm to complete
                today&apos;s {actionLabel}. This image is stored with the attendance
                record.
              </DialogDescription>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <ShieldCheck className="size-4 text-orange-500" strokeWidth={2} />
                Verification
              </div>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Face should be visible and centered before confirming.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="border-b border-slate-200 bg-slate-950 lg:border-b-0 lg:border-r">
            <div className="relative">
              {capturedDataUrl ? (
                <img
                  src={capturedDataUrl}
                  alt="Captured attendance selfie"
                  className="h-[300px] w-full object-cover sm:h-[420px]"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-[300px] w-full object-cover sm:h-[420px]"
                />
              )}

              <div className="pointer-events-none absolute inset-0 p-5 sm:p-6">
                <div className="relative h-full rounded-[24px] border border-white/70">
                  <div className="absolute left-4 top-4 h-8 w-8 rounded-tl-[16px] border-l border-t border-white/85" />
                  <div className="absolute right-4 top-4 h-8 w-8 rounded-tr-[16px] border-r border-t border-white/85" />
                  <div className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-[16px] border-b border-l border-white/85" />
                  <div className="absolute bottom-4 right-4 h-8 w-8 rounded-br-[16px] border-b border-r border-white/85" />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                    Align your face inside the frame
                  </div>
                </div>
              </div>

              <div className="absolute left-5 top-5">
                <Badge className="border-white/20 bg-black/35 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  {isPreviewMode ? "Preview ready" : isCameraReady ? "Camera active" : "Starting camera"}
                </Badge>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="bg-white p-6">
            <div className="space-y-5">
              <div className="rounded-[16px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff,#f7f9fc)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#0e315f] shadow-sm">
                    {isPreviewMode ? (
                      <CheckCircle2 className="size-5 text-emerald-600" strokeWidth={2.2} />
                    ) : (
                      <Camera className="size-5" strokeWidth={2.2} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[#0e315f]">
                      {isPreviewMode
                        ? "Review before you submit"
                        : "Capture a clear selfie"}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                      {isPreviewMode
                        ? `If the image looks blurred or off-center, retake it before confirming ${actionLabel}.`
                        : "Use the front camera in a well-lit area. Avoid cut-off faces or heavy backlight."}
                    </p>
                  </div>
                </div>
              </div>

              {cameraError ? (
                <div className="rounded-[16px] border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-red-700">
                        Camera access required
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-red-600">
                        {cameraError}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!isPunchOut ? (
                <div className="space-y-2">
                  <label
                    htmlFor="punch-in-note"
                    className="text-sm font-bold text-slate-700"
                  >
                    Reason for late arrival{" "}
                    <span className="font-medium text-slate-500">(optional)</span>
                  </label>
                  <Textarea
                    id="punch-in-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={500}
                    disabled={pending}
                    placeholder="Add a short reason if you are late"
                    className="resize-none"
                  />
                  <p className="text-xs font-medium text-slate-500">
                    This note will be saved with today&apos;s attendance record.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Quick checks
                </p>
                <div className="space-y-2">
                  {[
                    "Keep your face fully visible inside the guide.",
                    "Use steady lighting for a clear verification image.",
                    "Confirm only after reviewing the captured preview.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-[14px] border border-slate-200 px-4 py-3"
                    >
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
                      <p className="text-xs font-semibold leading-5 text-slate-600">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {isPreviewMode ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      className="h-11 w-full rounded-[12px] text-sm font-extrabold"
                      onClick={() => void confirmCapture()}
                      disabled={pending}
                    >
                      <CheckCircle2 className="size-4" />
                      {pending
                        ? "Uploading..."
                        : `Confirm ${actionLabel}`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-[12px] border-slate-200 text-sm font-extrabold shadow-none"
                      onClick={() => void retake()}
                      disabled={pending}
                    >
                      <RefreshCw className="size-4" />
                      Retake photo
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    className="h-11 w-full rounded-[12px] text-sm font-extrabold"
                    onClick={captureImage}
                    disabled={!isCameraReady || pending || Boolean(cameraError)}
                  >
                    <Camera className="size-4" />
                    Capture selfie
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full rounded-[12px] text-sm font-bold text-slate-500"
                  onClick={() => onOpenChange(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

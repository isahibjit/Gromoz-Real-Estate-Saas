import { useEffect, useState } from "react";
import { Loader2, Upload, Video } from "lucide-react";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui";

interface VideoUploadPreviewModalProps {
  open: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onConfirmUpload: (file: File) => Promise<void>;
}

export function VideoUploadPreviewModal({
  open,
  file,
  onOpenChange,
  onConfirmUpload,
}: VideoUploadPreviewModalProps) {
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setVideoPreviewUrl("");
    }
  }, [file]);

  if (!file) return null;

  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);

  const handleConfirm = async () => {
    try {
      setIsUploading(true);
      await onConfirmUpload(file);
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
      <DialogContent className="max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Video className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-secondary">
                Confirm Video Upload
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                Preview your selected video before uploading it to the project showcase.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Video Preview Player */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-inner">
            {videoPreviewUrl ? (
              <video
                controls
                src={videoPreviewUrl}
                className="aspect-video max-h-[300px] w-full object-contain"
              />
            ) : null}
          </div>

          {/* File Metadata Info */}
          <Card className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 shadow-none">
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1 pr-3">
                <p className="truncate font-extrabold text-secondary">
                  {file.name}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                  File Size: {fileSizeMb} MB · Format: {file.type || "video/mp4"}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-md bg-purple-100 px-2.5 py-1 text-[11px] font-extrabold text-purple-700">
                Ready to upload
              </span>
            </div>
          </Card>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              className="h-10 rounded-lg text-xs font-bold shadow-none"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={isUploading}
              className="h-10 rounded-lg bg-purple-600 px-5 text-xs font-extrabold text-white shadow-sm hover:bg-purple-700"
              onClick={handleConfirm}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin text-white" />
                  Uploading Video...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Confirm & Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

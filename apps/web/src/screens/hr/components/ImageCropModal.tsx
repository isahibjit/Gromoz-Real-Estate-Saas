import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent } from 'ui';
import {
  Crop,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  /** 'round' for circular avatar, 'rect' for square */
  cropShape?: 'round' | 'rect';
  /** Aspect ratio of the crop area (default 1 = square) */
  aspect?: number;
}

/**
 * Utility: Creates a canvas-cropped image from the crop area.
 */
async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  cropShape = 'round',
  aspect = 1,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropAreaChange = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);

    try {
      const croppedImage = await getCroppedImage(
        imageSrc,
        croppedAreaPixels,
      );
      onCropComplete(croppedImage);
    } catch {
      console.error('Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && handleCancel()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[520px] w-[95vw] overflow-hidden rounded-xl border-none bg-white p-0 shadow-[0_24px_70px_rgba(120,0,55,0.18)]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#780037]/10 bg-[#FCF6F6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-white text-primary shadow-sm">
              <Crop className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </div>

            <div>
              <h2 className="font-headline text-lg font-bold tracking-tight text-primary">
                Adjust Profile Photo
              </h2>

              <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
                Drag to position, scroll to zoom
              </p>
            </div>
          </div>
        </div>

        {/* Crop Area */}
        <div className="relative h-[340px] bg-[#1a1a1a]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
            style={{
              containerStyle: {
                borderRadius: 0,
              },
              mediaStyle: {},
              cropAreaStyle: {
                border: '3px solid rgba(120, 0, 55, 0.6)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              },
            }}
          />
        </div>

        {/* Zoom Control */}
        <div className="space-y-2 border-t border-[#780037]/5 px-6 py-4">
          <div className="flex items-center gap-4">
            <ZoomOut
              className="h-[18px] w-[18px] text-primary/50"
              strokeWidth={2.2}
            />

            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-primary/10 accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
            />

            <ZoomIn
              className="h-[18px] w-[18px] text-primary/50"
              strokeWidth={2.2}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[#780037]/10 bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="h-10 flex-1 rounded-lg border border-[#780037]/20 text-sm font-bold text-on-surface-variant transition-all hover:bg-primary/5"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing}
            className="flex h-10 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" strokeWidth={2.8} />
                Apply Crop
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
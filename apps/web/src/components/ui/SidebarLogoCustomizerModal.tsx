import React, { useState, useCallback, useEffect, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import * as Portal from "@radix-ui/react-portal";
import {
  X,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Settings,
  ChevronLeft,
  RotateCcw,
  RotateCw,
  Save,
  Maximize2,
  Building2,
  ZoomIn,
  Crop as CropIcon,
  Loader2,
  Upload,
  UserPlus,
  Target,
  User,
  CheckCircle2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
} from "lucide-react";
import { Button, Checkbox } from "ui";

export interface SidebarLogoCustomizerModalProps {
  isOpen: boolean;
  imageUrl: string;
  collapsedLogoUrl?: string;
  initialSettings?: {
    showLogoInSidebar?: boolean;
    sidebarLogoHeight?: number;
    sidebarLogoObjectFit?: "contain" | "cover";
    sidebarLogoBg?: string;
    sidebarLogoRadius?: number;
    sidebarLogoAlign?: "left" | "center" | "right";
    sidebarHeaderBg?: string;
  };
  onClose: () => void;
  onApply: (settings: {
    logoUrl: string;
    collapsedLogoUrl?: string;
    showLogoInSidebar: boolean;
    sidebarLogoHeight: number;
    sidebarLogoObjectFit: "contain" | "cover";
    sidebarLogoBg: string;
    sidebarLogoRadius: number;
    sidebarLogoAlign: "left" | "center" | "right";
    sidebarHeaderBg: string;
  }) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImgDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  const rotRad = (rotation * Math.PI) / 180;
  const rotatedWidth =
    Math.abs(Math.cos(rotRad) * image.naturalWidth) +
    Math.abs(Math.sin(rotRad) * image.naturalHeight);
  const rotatedHeight =
    Math.abs(Math.sin(rotRad) * image.naturalWidth) +
    Math.abs(Math.cos(rotRad) * image.naturalHeight);

  canvas.width = Math.ceil(rotatedWidth);
  canvas.height = Math.ceil(rotatedHeight);

  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) throw new Error("No cropped 2d context");

  croppedCanvas.width = Math.ceil(pixelCrop.width);
  croppedCanvas.height = Math.ceil(pixelCrop.height);

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL("image/png", 0.95);
}

const BG_OPTIONS = [
  { id: "transparent", label: "Transparent", value: "transparent", border: "border-slate-300" },
  { id: "white", label: "White Card", value: "#ffffff", border: "border-slate-200 shadow-2xs" },
  { id: "slate", label: "Slate Soft", value: "#f1f5f9", border: "border-slate-200" },
  { id: "navy", label: "Dark Navy", value: "#0d1f3d", border: "border-[#0d1f3d]" },
];

const HEADER_BG_PRESETS = [
  { id: "transparent", label: "Transparent", value: "transparent", border: "border-slate-300" },
  { id: "white", label: "White", value: "#ffffff", border: "border-slate-200 shadow-2xs" },
  { id: "light", label: "Light Gray", value: "#f8fafc", border: "border-slate-200" },
  { id: "navy", label: "Dark Navy", value: "#0d1f3d", border: "border-[#0d1f3d]" },
  { id: "blue", label: "Deep Blue", value: "#0b2e6b", border: "border-[#0b2e6b]" },
];

const RADIUS_OPTIONS = [
  { id: "sharp", label: "0px", value: 0 },
  { id: "subtle", label: "6px", value: 6 },
  { id: "rounded", label: "12px", value: 12 },
  { id: "pill", label: "Pill", value: 9999 },
];

const ALIGN_OPTIONS: { id: "left" | "center" | "right"; label: string; icon: any }[] = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
];

const ASPECT_RATIO_OPTIONS = [
  { id: "free", label: "Free / Auto", value: undefined },
  { id: "square", label: "1:1 Square", value: 1 },
  { id: "banner", label: "3:1 Banner", value: 3 },
  { id: "wide", label: "4:1 Wide", value: 4 },
];

export function SidebarLogoCustomizerModal({
  isOpen,
  imageUrl,
  collapsedLogoUrl,
  initialSettings,
  onClose,
  onApply,
}: SidebarLogoCustomizerModalProps) {
  // Target Logo Mode: Expanded Header vs Collapsed Icon
  const [activeTab, setActiveTab] = useState<"expanded" | "collapsed">("expanded");

  // Expanded Cropper State
  const [mainImageSource, setMainImageSource] = useState<string>(imageUrl);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>(imageUrl);

  // Collapsed Cropper State
  const [useCustomCollapsedLogo, setUseCustomCollapsedLogo] = useState<boolean>(
    Boolean(collapsedLogoUrl && collapsedLogoUrl.trim() !== "")
  );
  const [collapsedImageSource, setCollapsedImageSource] = useState<string>(
    collapsedLogoUrl || imageUrl
  );
  const [collapsedCrop, setCollapsedCrop] = useState({ x: 0, y: 0 });
  const [collapsedZoom, setCollapsedZoom] = useState(1);
  const [collapsedRotation, setCollapsedRotation] = useState(0);
  const [collapsedAreaPixels, setCollapsedAreaPixels] = useState<Area | null>(null);
  const [croppedCollapsedPreviewUrl, setCroppedCollapsedPreviewUrl] = useState<string>(
    collapsedLogoUrl || imageUrl
  );

  const [isProcessing, setIsProcessing] = useState(false);

  // Timer refs for debouncing preview rendering
  const mainPreviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const collapsedPreviewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden File Input Refs
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const collapsedFileInputRef = useRef<HTMLInputElement>(null);

  // Sidebar Styling State
  const [showLogoInSidebar, setShowLogoInSidebar] = useState(
    initialSettings?.showLogoInSidebar ?? true
  );
  const [logoHeight, setLogoHeight] = useState(
    initialSettings?.sidebarLogoHeight ?? 42
  );
  const [logoFit, setLogoFit] = useState<"contain" | "cover">(
    initialSettings?.sidebarLogoObjectFit ?? "contain"
  );
  const [logoBg, setLogoBg] = useState(
    initialSettings?.sidebarLogoBg ?? "transparent"
  );
  const [logoRadius, setLogoRadius] = useState(
    initialSettings?.sidebarLogoRadius ?? 6
  );
  const [logoAlign, setLogoAlign] = useState<"left" | "center" | "right">(
    initialSettings?.sidebarLogoAlign ?? "left"
  );
  const [headerBg, setHeaderBg] = useState<string>(
    initialSettings?.sidebarHeaderBg ?? "transparent"
  );
  const [previewMode, setPreviewMode] = useState<"expanded" | "collapsed">(
    "expanded"
  );
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isLogoSelected, setIsLogoSelected] = useState(false);

  const handleCornerDrag = useCallback(
    (e: React.MouseEvent, corner: "tl" | "tr" | "bl" | "br") => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingLogo(true);
      const startY = e.clientY;
      const startHeight = logoHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const multiplier = corner === "bl" || corner === "br" ? 1 : -1;
        const newHeight = Math.max(20, Math.min(64, startHeight + deltaY * multiplier));
        setLogoHeight(Math.round(newHeight));
      };

      const onMouseUp = () => {
        setIsDraggingLogo(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [logoHeight]
  );

  useEffect(() => {
    if (isOpen) {
      setMainImageSource(imageUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspect(undefined);
      setCroppedAreaPixels(null);
      setCroppedPreviewUrl(imageUrl);

      setUseCustomCollapsedLogo(Boolean(collapsedLogoUrl && collapsedLogoUrl.trim() !== ""));
      setCollapsedImageSource(collapsedLogoUrl || imageUrl);
      setCollapsedCrop({ x: 0, y: 0 });
      setCollapsedZoom(1);
      setCollapsedRotation(0);
      setCollapsedAreaPixels(null);
      setCroppedCollapsedPreviewUrl(collapsedLogoUrl || imageUrl);

      setShowLogoInSidebar(initialSettings?.showLogoInSidebar ?? true);
      setLogoHeight(initialSettings?.sidebarLogoHeight ?? 42);
      setLogoFit(initialSettings?.sidebarLogoObjectFit ?? "contain");
      setLogoBg(initialSettings?.sidebarLogoBg ?? "transparent");
      setLogoRadius(initialSettings?.sidebarLogoRadius ?? 6);
      setLogoAlign(initialSettings?.sidebarLogoAlign ?? "left");
      setHeaderBg(initialSettings?.sidebarHeaderBg ?? "transparent");
      setActiveTab("expanded");
      setPreviewMode("expanded");
    }
  }, [isOpen, imageUrl, collapsedLogoUrl, initialSettings]);

  useEffect(() => {
    return () => {
      if (mainPreviewTimerRef.current) clearTimeout(mainPreviewTimerRef.current);
      if (collapsedPreviewTimerRef.current) clearTimeout(collapsedPreviewTimerRef.current);
    };
  }, []);

  // Main Crop Callback
  const onMainCropCompleteCallback = useCallback(
    (_croppedArea: Area, pixelCrop: Area) => {
      setCroppedAreaPixels(pixelCrop);
      if (mainPreviewTimerRef.current) clearTimeout(mainPreviewTimerRef.current);

      mainPreviewTimerRef.current = setTimeout(async () => {
        try {
          const livePreview = await getCroppedImgDataUrl(mainImageSource, pixelCrop, rotation);
          setCroppedPreviewUrl(livePreview);
        } catch {
          /* ignore */
        }
      }, 150);
    },
    [mainImageSource, rotation]
  );

  // Collapsed Crop Callback
  const onCollapsedCropCompleteCallback = useCallback(
    (_croppedArea: Area, pixelCrop: Area) => {
      setCollapsedAreaPixels(pixelCrop);
      if (collapsedPreviewTimerRef.current) clearTimeout(collapsedPreviewTimerRef.current);

      collapsedPreviewTimerRef.current = setTimeout(async () => {
        try {
          const livePreview = await getCroppedImgDataUrl(
            collapsedImageSource,
            pixelCrop,
            collapsedRotation
          );
          setCroppedCollapsedPreviewUrl(livePreview);
        } catch {
          /* ignore */
        }
      }, 150);
    },
    [collapsedImageSource, collapsedRotation]
  );

  // File Upload Handlers
  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setMainImageSource(reader.result as string);
          setCroppedPreviewUrl(reader.result as string);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCollapsedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setCollapsedImageSource(reader.result as string);
          setCroppedCollapsedPreviewUrl(reader.result as string);
          setCollapsedCrop({ x: 0, y: 0 });
          setCollapsedZoom(1);
          setUseCustomCollapsedLogo(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleReset = () => {
    setMainImageSource(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(undefined);
    setCroppedPreviewUrl(imageUrl);

    setUseCustomCollapsedLogo(false);
    setCollapsedImageSource(imageUrl);
    setCollapsedCrop({ x: 0, y: 0 });
    setCollapsedZoom(1);
    setCollapsedRotation(0);
    setCroppedCollapsedPreviewUrl(imageUrl);

    setShowLogoInSidebar(true);
    setLogoHeight(42);
    setLogoFit("contain");
    setLogoBg("transparent");
    setLogoRadius(6);
    setLogoAlign("left");
    setHeaderBg("transparent");
  };

  const handleConfirmSave = async () => {
    try {
      setIsProcessing(true);
      let finalMainDataUrl = mainImageSource;
      if (croppedAreaPixels) {
        finalMainDataUrl = await getCroppedImgDataUrl(
          mainImageSource,
          croppedAreaPixels,
          rotation
        );
      }

      let finalCollapsedDataUrl = "";
      if (useCustomCollapsedLogo) {
        if (collapsedAreaPixels) {
          finalCollapsedDataUrl = await getCroppedImgDataUrl(
            collapsedImageSource,
            collapsedAreaPixels,
            collapsedRotation
          );
        } else {
          finalCollapsedDataUrl = collapsedImageSource;
        }
      }

      onApply({
        logoUrl: finalMainDataUrl,
        collapsedLogoUrl: useCustomCollapsedLogo ? finalCollapsedDataUrl : "",
        showLogoInSidebar,
        sidebarLogoHeight: logoHeight,
        sidebarLogoObjectFit: logoFit,
        sidebarLogoBg: logoBg,
        sidebarLogoRadius: logoRadius,
        sidebarLogoAlign: logoAlign,
        sidebarHeaderBg: headerBg,
      });
    } catch {
      onApply({
        logoUrl: mainImageSource,
        collapsedLogoUrl: useCustomCollapsedLogo ? collapsedImageSource : "",
        showLogoInSidebar,
        sidebarLogoHeight: logoHeight,
        sidebarLogoObjectFit: logoFit,
        sidebarLogoBg: logoBg,
        sidebarLogoRadius: logoRadius,
        sidebarLogoAlign: logoAlign,
        sidebarHeaderBg: headerBg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getAlignJustifyClass = (align: "left" | "center" | "right") => {
    if (align === "center") return "justify-center";
    if (align === "right") return "justify-end";
    return "justify-start";
  };

  return (
    <Portal.Root>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 font-sans">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0D1F3D]/70"
          />

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={mainFileInputRef}
            onChange={handleMainFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={collapsedFileInputRef}
            onChange={handleCollapsedFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1F3D] text-white shadow-xs">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#0D1F3D] tracking-tight">
                    Sidebar Brand Logo Customizer
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure expanded sidebar logo & optional mini collapsed icon with live preview.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Tab Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-6 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("expanded");
                    setPreviewMode("expanded");
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "expanded"
                      ? "bg-[#0D1F3D] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Maximize2 className={`h-3.5 w-3.5 ${activeTab === "expanded" ? "text-white" : "text-slate-400"}`} />
                  Expanded Sidebar Logo (295px)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("collapsed");
                    setPreviewMode("collapsed");
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "collapsed"
                      ? "bg-[#0D1F3D] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Minimize2 className={`h-3.5 w-3.5 ${activeTab === "collapsed" ? "text-white" : "text-slate-400"}`} />
                  Collapsed Sidebar Icon (80px)
                  {useCustomCollapsedLogo && (
                    <span className={`h-2 w-2 rounded-full ${activeTab === "collapsed" ? "bg-indigo-300" : "bg-indigo-600"}`} title="Custom Collapsed Icon Set" />
                  )}
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400 hidden sm:block">
                Visiblo Smart Field Work Design System
              </span>
            </div>

            {/* Modal Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto min-h-0">
              {/* Left Column: Interactive Image Cropper & Resizer Canvas */}
              <div className="lg:col-span-6 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4 flex flex-col justify-between">
                {activeTab === "expanded" ? (
                  /* Expanded Logo Tab Content */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0D1F3D] flex items-center gap-1.5">
                        <CropIcon className="h-4 w-4 text-[#0D1F3D]" />
                        1. Crop & Scale Main Logo
                      </span>
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      >
                        <Upload className="h-3 w-3 text-[#0D1F3D]" /> Change Image
                      </button>
                    </div>

                    {/* Interactive Cropper Canvas Box */}
                    <div className="relative h-60 sm:h-64 w-full rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shadow-inner">
                      {mainImageSource ? (
                        <Cropper
                          image={mainImageSource}
                          crop={crop}
                          zoom={zoom}
                          rotation={rotation}
                          aspect={aspect}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onMainCropCompleteCallback}
                          showGrid={true}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400 text-xs font-medium">
                          No image loaded
                        </div>
                      )}
                    </div>

                    {/* Aspect Ratio Selector */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#0D1F3D] block">
                        Crop Aspect Ratio
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ASPECT_RATIO_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAspect(opt.value)}
                            className={`py-1 text-[11px] font-semibold rounded border text-center transition ${
                              aspect === opt.value
                                ? "border-[#0D1F3D] bg-[#0D1F3D] text-white shadow-2xs"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zoom & Rotation Sliders */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Zoom Control */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#0D1F3D] flex items-center gap-1">
                            <ZoomIn className="h-3 w-3 text-[#0D1F3D]" /> Zoom
                          </span>
                          <span className="font-mono font-bold text-[#0D1F3D]">{zoom.toFixed(1)}x</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-[#0D1F3D] h-1.5 bg-slate-200 rounded cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rotation Control */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#0D1F3D] flex items-center gap-1">
                            <RotateCw className="h-3 w-3 text-[#0D1F3D]" /> Rotation
                          </span>
                          <span className="font-mono font-bold text-[#0D1F3D]">{rotation}°</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <RotateCcw className="h-3 w-3" /> -90°
                          </button>
                          <button
                            type="button"
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <RotateCw className="h-3 w-3" /> +90°
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Collapsed Logo Tab Content */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0D1F3D] flex items-center gap-1.5">
                        <Minimize2 className="h-4 w-4 text-[#0D1F3D]" />
                        2. Collapsed Icon Configuration
                      </span>
                    </div>

                    {/* Toggle: Use Main Logo vs Dedicated Collapsed Icon */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="collapsedLogoMode"
                          checked={!useCustomCollapsedLogo}
                          onChange={() => setUseCustomCollapsedLogo(false)}
                          className="accent-[#0D1F3D]"
                        />
                        <span className="text-xs font-semibold text-[#0D1F3D]">
                          Use main logo automatically (Auto-scaled)
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="collapsedLogoMode"
                          checked={useCustomCollapsedLogo}
                          onChange={() => setUseCustomCollapsedLogo(true)}
                          className="accent-[#0D1F3D]"
                        />
                        <span className="text-xs font-semibold text-[#0D1F3D]">
                          Upload dedicated mini icon / emblem (1:1 Square)
                        </span>
                      </label>
                    </div>

                    {useCustomCollapsedLogo ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#0D1F3D]">
                            Crop Collapsed Mini Icon (1:1)
                          </span>
                          <button
                            type="button"
                            onClick={() => collapsedFileInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                          >
                            <Upload className="h-3 w-3 text-[#0D1F3D]" /> Upload Icon File
                          </button>
                        </div>

                        <div className="relative h-52 w-full rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shadow-inner">
                          {collapsedImageSource ? (
                            <Cropper
                              image={collapsedImageSource}
                              crop={collapsedCrop}
                              zoom={collapsedZoom}
                              rotation={collapsedRotation}
                              aspect={1}
                              onCropChange={setCollapsedCrop}
                              onZoomChange={setCollapsedZoom}
                              onCropComplete={onCollapsedCropCompleteCallback}
                              showGrid={true}
                              cropShape="rect"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400 text-xs font-medium">
                              Upload a 1:1 icon image
                            </div>
                          )}
                        </div>

                        {/* Zoom Control */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#0D1F3D]">Icon Zoom</span>
                            <span className="font-mono font-bold text-[#0D1F3D]">
                              {collapsedZoom.toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={collapsedZoom}
                            onChange={(e) => setCollapsedZoom(Number(e.target.value))}
                            className="w-full accent-[#0D1F3D] h-1.5 bg-slate-200 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Auto-Scaling Active
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          The main expanded logo will automatically fit into the 80px collapsed sidebar header seamlessly.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 font-medium text-center bg-slate-50 p-2 rounded border border-slate-200 mt-2">
                  Visiblo High-Res Canvas Rendering • Real-time 60 FPS UI preview
                </p>
              </div>

              {/* Right Column: Live Sidebar Preview & Scaling Controls */}
              <div className="lg:col-span-6 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0D1F3D] flex items-center gap-1.5">
                      <Maximize2 className="h-4 w-4 text-[#0D1F3D]" />
                      Live Sidebar Header Preview
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("expanded")}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${
                          previewMode === "expanded"
                            ? "bg-[#0D1F3D] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Expanded (295px)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("collapsed")}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${
                          previewMode === "collapsed"
                            ? "bg-[#0D1F3D] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Collapsed (80px)
                      </button>
                    </div>
                  </div>

                  {/* Mock Sidebar Canvas matching AppShell 100% */}
                  <div
                    className="flex justify-center bg-slate-100 p-6 rounded-lg border border-slate-200 select-none"
                    onClick={() => setIsLogoSelected(false)}
                  >
                    <div
                      className={`bg-white border border-slate-200 rounded-lg shadow-md transition-all duration-300 relative flex flex-col justify-between ${
                        previewMode === "expanded" ? "w-[275px]" : "w-[80px]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLogoSelected(false);
                      }}
                    >
                      {/* Mini Sidebar Brand Header - 80px (h-20) Height */}
                      <div
                        className={`flex h-20 items-center border-b border-slate-100 transition-all relative overflow-visible z-20 ${
                          previewMode === "expanded"
                            ? "justify-between px-3"
                            : "justify-center px-1.5"
                        }`}
                        style={{
                          backgroundColor: headerBg,
                        }}
                      >
                        {showLogoInSidebar ? (
                          previewMode === "expanded" ? (
                            croppedPreviewUrl ? (
                              <div
                                className={`flex items-center w-full transition-all ${getAlignJustifyClass(logoAlign)}`}
                              >
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLogoSelected(true);
                                  }}
                                  className={`relative group transition-all duration-150 rounded cursor-pointer ${
                                    isLogoSelected || isDraggingLogo
                                      ? "border-2 border-sky-500 ring-2 ring-sky-300/50 bg-sky-500/10 shadow-sm"
                                      : "border-2 border-transparent hover:border-sky-400/60 hover:bg-sky-500/5"
                                  }`}
                                  style={{
                                    backgroundColor: logoBg,
                                    borderRadius: `${logoRadius}px`,
                                    padding: logoBg !== "transparent" ? "3px 6px" : "2px",
                                  }}
                                >
                                  {/* Canva Floating Dimension Badge (Floats OUTSIDE above image with z-50) */}
                                  {(isLogoSelected || isDraggingLogo) && (
                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0D1F3D] text-white px-2.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-xl border border-sky-400/40 flex items-center gap-1 z-50 whitespace-nowrap animate-in fade-in duration-150 pointer-events-none">
                                      <Sparkles className="h-2.5 w-2.5 text-sky-400" />
                                      <span>Height: {logoHeight}px</span>
                                    </div>
                                  )}

                                  {/* Canva Corner Handles for Drag Resizing (z-50 high priority) */}
                                  {(isLogoSelected || isDraggingLogo) && (
                                    <>
                                      <div
                                        onMouseDown={(e) => handleCornerDrag(e, "tl")}
                                        className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                                        title="Drag corner to scale image height"
                                      />
                                      <div
                                        onMouseDown={(e) => handleCornerDrag(e, "tr")}
                                        className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                                        title="Drag corner to scale image height"
                                      />
                                      <div
                                        onMouseDown={(e) => handleCornerDrag(e, "bl")}
                                        className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                                        title="Drag corner to scale image height"
                                      />
                                      <div
                                        onMouseDown={(e) => handleCornerDrag(e, "br")}
                                        className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                                        title="Drag corner to scale image height"
                                      />
                                    </>
                                  )}

                                  <img
                                    src={croppedPreviewUrl}
                                    alt="Expanded Logo Preview"
                                    style={{
                                      height: `${logoHeight}px`,
                                      maxHeight: "58px",
                                      maxWidth: "190px",
                                      objectFit: logoFit,
                                    }}
                                    className="pointer-events-none select-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-700">Default Logo</span>
                            )
                          ) : (
                            /* Collapsed View Preview */
                            useCustomCollapsedLogo && croppedCollapsedPreviewUrl ? (
                              <div
                                className="flex items-center justify-center transition-all"
                                style={{
                                  backgroundColor: logoBg,
                                  borderRadius: `${logoRadius}px`,
                                  padding: logoBg !== "transparent" ? "2px 4px" : "0px",
                                }}
                              >
                                <img
                                  src={croppedCollapsedPreviewUrl}
                                  alt="Collapsed Icon Preview"
                                  style={{
                                    height: "36px",
                                    width: "36px",
                                    objectFit: "contain",
                                  }}
                                />
                              </div>
                            ) : croppedPreviewUrl ? (
                              <div
                                className="flex items-center justify-center transition-all"
                                style={{
                                  backgroundColor: logoBg,
                                  borderRadius: `${logoRadius}px`,
                                  padding: logoBg !== "transparent" ? "2px 4px" : "0px",
                                }}
                              >
                                <img
                                  src={croppedPreviewUrl}
                                  alt="Scaled Main Logo Preview"
                                  style={{
                                    height: `${Math.min(logoHeight, 40)}px`,
                                    maxHeight: "44px",
                                    maxWidth: "48px",
                                    objectFit: logoFit,
                                  }}
                                />
                              </div>
                            ) : (
                              <Building2 className="h-5 w-5 text-slate-400" />
                            )
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            {previewMode === "expanded" && (
                              <span className="text-xs font-semibold text-slate-700">
                                Default System Logo
                              </span>
                            )}
                          </div>
                        )}

                        {previewMode === "expanded" && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-400 border border-slate-200 shrink-0 ml-1">
                            <ChevronLeft className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Mini Sidebar Navigation Menu Items matching AppShell 100% */}
                      <div className={`p-2.5 space-y-4 min-h-[180px] ${previewMode === "collapsed" ? "px-1 text-center" : ""}`}>
                        <div>
                          {previewMode === "expanded" && (
                            <p className="px-3 text-[11px] font-medium text-slate-400 pt-1 pb-1">Main</p>
                          )}
                          <div
                            className={`flex items-center rounded-sm py-2 transition-all ${
                              previewMode === "expanded"
                                ? "px-3 gap-3 justify-start bg-[#0D1F3D] text-white text-[13px] font-semibold shadow-xs"
                                : "w-11 h-9 mx-auto justify-center px-0 bg-[#0D1F3D] text-white shadow-xs font-semibold"
                            }`}
                            title="Dashboard"
                          >
                            <LayoutDashboard className="h-4.5 w-4.5 shrink-0 text-white" />
                            {previewMode === "expanded" && <span className="truncate">Dashboard</span>}
                          </div>
                        </div>

                        <div>
                          {previewMode === "expanded" && (
                            <p className="px-3 text-[11px] font-medium text-slate-400 pt-1 pb-1">Sales & Field</p>
                          )}
                          <div className="space-y-1">
                            <div
                              className={`flex items-center rounded-sm py-2 text-slate-600 hover:bg-slate-100/80 transition-all ${
                                previewMode === "expanded"
                                  ? "px-3 gap-3 justify-between text-[13px] font-medium"
                                  : "w-11 h-9 mx-auto justify-center px-0 text-slate-400"
                              }`}
                              title="Sales Pipeline"
                            >
                              <div className={`flex items-center ${previewMode === "expanded" ? "gap-3 min-w-0" : "justify-center"}`}>
                                <TrendingUp className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                                {previewMode === "expanded" && <span className="truncate">Sales Pipeline</span>}
                              </div>
                              {previewMode === "expanded" && (
                                <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold bg-red-50 text-[#E20613] border border-red-200/60">
                                  ₹2.46 Cr
                                </span>
                              )}
                            </div>

                            <div
                              className={`flex items-center rounded-sm py-2 text-slate-600 hover:bg-slate-100/80 transition-all ${
                                previewMode === "expanded"
                                  ? "px-3 gap-3 justify-between text-[13px] font-medium"
                                  : "w-11 h-9 mx-auto justify-center px-0 text-slate-400"
                              }`}
                              title="Leads Management"
                            >
                              <div className={`flex items-center ${previewMode === "expanded" ? "gap-3 min-w-0" : "justify-center"}`}>
                                <UserPlus className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                                {previewMode === "expanded" && <span className="truncate">Leads Management</span>}
                              </div>
                              {previewMode === "expanded" && (
                                <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold bg-red-50 text-[#E20613] border border-red-200/60">
                                  1,250 Leads
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mini Sidebar Bottom Profile Card matching AppShell 100% */}
                      <div className={`p-2 border-t border-slate-100 bg-slate-50/70 flex items-center ${previewMode === "expanded" ? "justify-between" : "justify-center"}`}>
                        <div className={`flex items-center ${previewMode === "expanded" ? "gap-2 min-w-0" : "justify-center"}`}>
                          <div className="h-7 w-7 rounded-full bg-[#0D1F3D] text-white flex items-center justify-center font-semibold text-[10px] shrink-0">
                            AD
                          </div>
                          {previewMode === "expanded" && (
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-[#0D1F3D] truncate">Super Admin</p>
                              <p className="text-[9px] text-slate-500 font-medium truncate">admin@visiblo.com</p>
                            </div>
                          )}
                        </div>
                        {previewMode === "expanded" && (
                          <Settings className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Header Background Color Picker (Top Priority Control) */}
                  <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-[#0D1F3D] block">
                          Sidebar Header Background Color
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Applies custom background color to top 80px sidebar header
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={headerBg === "transparent" ? "#ffffff" : headerBg}
                          onChange={(e) => setHeaderBg(e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer border border-slate-300 p-0 overflow-hidden bg-white shadow-2xs"
                          title="Pick Header Custom Color"
                        />
                        <input
                          type="text"
                          value={headerBg}
                          onChange={(e) => setHeaderBg(e.target.value)}
                          placeholder="#ffffff or transparent"
                          className="w-28 px-2 py-0.5 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#0D1F3D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {HEADER_BG_PRESETS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setHeaderBg(opt.value)}
                          className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded border text-center transition ${
                            headerBg === opt.value
                              ? "border-[#0D1F3D] bg-white font-semibold ring-1 ring-[#0D1F3D]/30"
                              : "border-slate-200 bg-white/70 hover:bg-white text-slate-600"
                          }`}
                        >
                          <div
                            className={`h-3 w-3 rounded-full border ${opt.border}`}
                            style={{
                              backgroundColor:
                                opt.value === "transparent" ? "#ffffff" : opt.value,
                            }}
                          />
                          <span className="text-[9px] font-semibold truncate">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Logo Height Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-[#0D1F3D]">
                        Expanded Logo Height Scale
                      </label>
                      <span className="font-mono font-bold text-[#0D1F3D] bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs">
                        {logoHeight}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="56"
                      step="2"
                      value={logoHeight}
                      onChange={(e) => setLogoHeight(Number(e.target.value))}
                      className="w-full accent-[#0D1F3D] cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Logo Alignment Feature */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D1F3D] block">
                      Logo Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALIGN_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogoAlign(opt.id)}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border text-xs font-semibold transition ${
                              logoAlign === opt.id
                                ? "border-[#0D1F3D] bg-[#0D1F3D] text-white shadow-2xs"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logo Card Background Fill */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D1F3D] block">
                      Logo Card Fill
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BG_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLogoBg(opt.value)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded border text-center transition ${
                            logoBg === opt.value
                              ? "border-[#0D1F3D] bg-slate-100 font-semibold ring-1 ring-[#0D1F3D]/30"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full border ${opt.border}`}
                            style={{
                              backgroundColor:
                                opt.value === "transparent" ? "#ffffff" : opt.value,
                            }}
                          />
                          <span className="text-[10px] font-semibold text-slate-700 truncate">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Container Corner Radius */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D1F3D] block">
                      Container Radius
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLogoRadius(opt.value)}
                          className={`py-1 text-[11px] font-semibold rounded border text-center transition ${
                            logoRadius === opt.value
                              ? "border-[#0D1F3D] bg-[#0D1F3D] text-white shadow-2xs"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar Header Toggle */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0D1F3D]">
                    Show Logo in Sidebar Header
                  </span>
                  <Checkbox
                    checked={showLogoInSidebar}
                    onChange={setShowLogoInSidebar}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing}
                className="gap-1.5 font-semibold text-xs text-slate-600 border-slate-300 hover:bg-white"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                Reset Defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="font-semibold text-xs border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmSave}
                  disabled={isProcessing}
                  className="gap-1.5 font-semibold text-xs shadow-md bg-[#0D1F3D] hover:bg-[#071326] text-white min-w-[190px] justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      Saving Branding...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 text-white" />
                      Apply Workspace Branding
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal.Root>
  );
}

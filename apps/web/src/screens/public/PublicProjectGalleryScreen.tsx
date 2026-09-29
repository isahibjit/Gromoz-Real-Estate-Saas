import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  Grid2X2,
  IndianRupee,
  Layers,
  MapPin,
  Maximize2,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { Badge, Button, Card, cn } from "ui";

import { api } from "../../common/api";
import type {
  ProjectCatalogItem,
  ProjectConfigurationVariant,
} from "../admin/projects/projectsData";
import { getProjectShareImages } from "../admin/projects/projectWhatsappShare";

function ProjectGallerySkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-xl bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-slate-200" />
            <div className="h-9 w-28 animate-pulse rounded-md bg-slate-200" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-8">
        <div className="h-[420px] w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl bg-white border border-slate-200 p-6" />
            <div className="h-64 animate-pulse rounded-2xl bg-white border border-slate-200 p-6" />
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-white border border-slate-200 p-6" />
        </div>
      </main>
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Building2 className="size-7" />
        </div>
        <h1 className="mt-5 text-xl font-black text-secondary">
          Project Showcase Unavailable
        </h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">
          The requested project link may have been updated or is no longer
          active.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            type="button"
            className="h-10 rounded-lg px-6 text-xs font-bold"
            onClick={() => (window.location.href = "/")}
          >
            Return to Portal
          </Button>
        </div>
      </Card>
    </div>
  );
}

function extractYouTubeEmbedUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.includes("youtube.com/embed/")) {
    const idMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    return idMatch ? `https://www.youtube.com/embed/${idMatch[1]}` : trimmed;
  }

  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return "";
}

interface PublicProjectGalleryScreenProps {
  activeView?: "img" | "br" | "vd";
}

export function PublicProjectGalleryScreen({
  activeView,
}: PublicProjectGalleryScreenProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedConfigTab, setSelectedConfigTab] = useState("all");
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const projectQuery = useQuery({
    queryKey: ["public-projects", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const response = await api.get<ProjectCatalogItem>(
        `/public-projects/${projectId}`,
      );
      return response.data;
    },
  });

  const project = projectQuery.data;

  // Build gallery strictly using user-uploaded project images (no un-uploaded fallback stock photos)
  const galleryItems = useMemo(() => {
    if (!project) return [];

    const rawList = [
      project.imageUrl,
      ...(project.imageGallery ?? []),
    ].filter(
      (url): url is string =>
        Boolean(url && typeof url === "string" && url.trim().length > 0),
    );

    const userImages = Array.from(new Set(rawList.map((url) => url.trim())));

    return userImages.map((url, idx) => ({
      url,
      label: idx === 0 ? "Featured Project Cover" : `Gallery Photo ${idx + 1}`,
    }));
  }, [project]);

  const activePhoto = galleryItems[activeImageIndex] ?? galleryItems[0];

  const videoList = useMemo(
    () =>
      (project?.videoUrls?.length
        ? project.videoUrls
        : [project?.videoUrl]
      ).filter(Boolean) as string[],
    [project?.videoUrl, project?.videoUrls],
  );

  const activeVideoUrl = videoList[selectedVideoIndex] ?? videoList[0] ?? "";
  const activeVideoEmbedUrl = useMemo(() => {
    return extractYouTubeEmbedUrl(activeVideoUrl);
  }, [activeVideoUrl]);

  useEffect(() => {
    if (activeView === "vd" || window.location.pathname.endsWith("/vd")) {
      setTimeout(() => {
        document
          .getElementById("videos-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    } else if (
      activeView === "br" ||
      window.location.pathname.endsWith("/br")
    ) {
      if (project?.brochureUrl || project?.brochures?.[0]?.url) {
        const url = project.brochureUrl || project.brochures?.[0]?.url;
        if (url) window.open(url, "_blank");
      }
    }
  }, [activeView, project]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Project share link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Explore ${project?.name ?? "Project Showcase"} by ${
      project?.developer ?? "Truroot Realty"
    } in ${
      project?.location ?? "Prime Location"
    }.\nCheck detailed gallery & options: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (projectQuery.isLoading) {
    return <ProjectGallerySkeleton />;
  }

  if (!project) {
    return <ProjectNotFound />;
  }

  const configurationsList = project.configurations ?? [];
  const configurationVariants = project.configurationVariants ?? [];
  const filteredVariants =
    selectedConfigTab === "all"
      ? configurationVariants
      : configurationVariants.filter(
          (v: ProjectConfigurationVariant) =>
            v.configuration === selectedConfigTab,
        );

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-secondary antialiased">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black tracking-tight text-secondary truncate sm:text-lg">
                  {project.name}
                </h1>
                <Badge className="border-0 bg-emerald-50 text-[10px] font-extrabold text-emerald-700">
                  <ShieldCheck className="mr-1 size-3" /> Verified Showcase
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-700 mt-0.5">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="truncate">{project.location}</span>
                {project.developer ? (
                  <span className="text-muted-foreground font-semibold">
                    · By {project.developer}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-slate-200 text-xs font-bold shadow-none hover:bg-slate-50"
              onClick={copyShareLink}
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 size-3.5 text-success" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 size-3.5" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Photo Gallery Grid Showcase */}
        <section className="space-y-3">
          {galleryItems.length === 0 ? (
            <div className="flex h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
              <Building2 className="size-10 text-slate-300" />
              <p className="mt-3 text-sm font-extrabold text-secondary">
                No Gallery Photos Uploaded
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Visual gallery photos for {project.name} have not been uploaded yet.
              </p>
            </div>
          ) : galleryItems.length === 1 ? (
            <div
              className="group relative h-[380px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
              onClick={() => {
                setActiveImageIndex(0);
                setIsLightboxOpen(true);
              }}
            >
              <img
                src={galleryItems[0].url}
                alt={galleryItems[0].label}
                className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <Badge className="border-0 bg-black/60 text-[11px] font-semibold text-white backdrop-blur-md mb-1.5">
                    Featured Photo
                  </Badge>
                  <p className="text-sm font-semibold text-white drop-shadow-xs">
                    {galleryItems[0].label}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all group-hover:bg-black/80">
                  <Maximize2 className="size-3.5" /> Fullscreen
                </span>
              </div>
            </div>
          ) : galleryItems.length === 2 ? (
            <div className="hidden lg:grid h-[380px] grid-cols-2 gap-4">
              {galleryItems.map((item, idx) => (
                <div
                  key={`${item.url}-${idx}`}
                  className="group relative h-full w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setIsLightboxOpen(true);
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="truncate rounded-md bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      {item.label}
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-md transition-all group-hover:bg-black/80">
                      <Maximize2 className="size-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : galleryItems.length >= 3 && galleryItems.length < 5 ? (
            <div className="hidden lg:grid h-[400px] grid-cols-3 gap-4">
              <div
                className="group relative col-span-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
                onClick={() => {
                  setActiveImageIndex(0);
                  setIsLightboxOpen(true);
                }}
              >
                <img
                  src={galleryItems[0].url}
                  alt={galleryItems[0].label}
                  className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <span className="truncate rounded-md bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    {galleryItems[0].label}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                    <Maximize2 className="size-3.5" /> Fullscreen
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {galleryItems.slice(1).map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="group relative flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
                    onClick={() => {
                      setActiveImageIndex(idx + 1);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="truncate rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hidden lg:grid h-[420px] grid-cols-4 grid-rows-2 gap-4">
              <div
                className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
                onClick={() => {
                  setActiveImageIndex(0);
                  setIsLightboxOpen(true);
                }}
              >
                <img
                  src={galleryItems[0]?.url}
                  alt={galleryItems[0]?.label}
                  className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <Badge className="border-0 bg-black/60 text-[11px] font-semibold text-white backdrop-blur-md mb-1.5">
                      Featured Photo
                    </Badge>
                    <p className="text-sm font-semibold text-white drop-shadow-xs">
                      {galleryItems[0]?.label}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all group-hover:bg-black/80">
                    <Maximize2 className="size-3.5" /> Fullscreen
                  </span>
                </div>
              </div>

              {galleryItems.slice(1, 5).map((item, idx) => (
                <div
                  key={`${item.url}-${idx}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs cursor-pointer"
                  onClick={() => {
                    setActiveImageIndex(idx + 1);
                    setIsLightboxOpen(true);
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="truncate rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      {item.label}
                    </span>
                  </div>
                  {idx === 3 && galleryItems.length > 5 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white">
                      <span className="text-sm font-bold tracking-wide">
                        +{galleryItems.length - 5} More Photos
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Mobile & Tablet Slider Viewer */}
          {galleryItems.length > 0 ? (
            <div className={cn("space-y-3", galleryItems.length >= 2 ? "block lg:hidden" : "hidden")}>
              <Card className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs">
                <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9]">
                  <img
                    src={activePhoto?.url}
                    alt={activePhoto?.label}
                    className="size-full object-cover transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {galleryItems.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Previous photo"
                        className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all active:scale-95"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === 0 ? galleryItems.length - 1 : prev - 1,
                          )
                        }
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all active:scale-95"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === galleryItems.length - 1 ? 0 : prev + 1,
                          )
                        }
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  ) : null}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="rounded-md bg-black/70 px-2.5 py-1 text-xs font-black text-white backdrop-blur-md">
                      {activeImageIndex + 1} / {galleryItems.length}
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md"
                      onClick={() => setIsLightboxOpen(true)}
                    >
                      <Maximize2 className="size-3.5" /> Fullscreen
                    </button>
                  </div>
                </div>
              </Card>

              {galleryItems.length > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {galleryItems.map((item, idx) => (
                    <button
                      key={`${item.url}-${idx}`}
                      type="button"
                      className={cn(
                        "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                        idx === activeImageIndex
                          ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                          : "border-slate-200 opacity-70 hover:opacity-100",
                      )}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* 2-Column Main Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Left Main Information Stack */}
          <div className="space-y-8 min-w-0">
            {/* Quick Specs Highlight Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-primary">
                    <IndianRupee className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Price Range
                    </p>
                    <p className="truncate text-sm font-extrabold text-secondary mt-0.5">
                      {project.priceRange || "On Request"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Grid2X2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Configurations
                    </p>
                    <p className="truncate text-sm font-extrabold text-secondary mt-0.5">
                      {configurationsList.join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Compass className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Possession
                    </p>
                    <p className="truncate text-sm font-extrabold text-secondary mt-0.5">
                      {project.possession || "Ready To Move"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <Layers className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Tower / Floors
                    </p>
                    <p className="truncate text-sm font-extrabold text-secondary mt-0.5">
                      {project.numberOfFloors
                        ? `${project.numberOfFloors} Floors`
                        : "Multiple Towers"}
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* About Project & Description */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
              <h2 className="text-lg font-black tracking-tight text-secondary">
                About {project.name}
              </h2>
              <p className="text-sm font-medium leading-relaxed text-slate-700">
                {project.description ||
                  `${project.name} is a premier residential showcase developer property located in ${project.location}. Designed for modern living with high quality finishes, structural excellence, and top-tier security.`}
              </p>

              <div className="flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-muted-foreground flex-wrap">
                <span>
                  Developer:{" "}
                  <strong className="text-secondary">
                    {project.developer || "Truroot Realty"}
                  </strong>
                </span>
                <span>
                  Location:{" "}
                  <strong className="text-secondary">{project.location}</strong>
                </span>
                <span>
                  RERA Status:{" "}
                  <strong className="text-emerald-700">Approved</strong>
                </span>
              </div>
            </Card>

            {/* Floor Plans & Configuration Carpet Area Options */}
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-secondary">
                    Carpet Area & Floor Plan Variants
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Explore individual unit specs, sizes, and pricing options.
                  </p>
                </div>

                {configurationsList.length > 1 ? (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all",
                        selectedConfigTab === "all"
                          ? "bg-white text-primary shadow-xs"
                          : "text-muted-foreground hover:text-secondary",
                      )}
                      onClick={() => setSelectedConfigTab("all")}
                    >
                      All ({configurationVariants.length})
                    </button>
                    {configurationsList.map((cfg: string) => (
                      <button
                        key={cfg}
                        type="button"
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all",
                          selectedConfigTab === cfg
                            ? "bg-white text-primary shadow-xs"
                            : "text-muted-foreground hover:text-secondary",
                        )}
                        onClick={() => setSelectedConfigTab(cfg)}
                      >
                        {cfg}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVariants.length > 0 ? (
                  filteredVariants.map(
                    (variant: ProjectConfigurationVariant, index: number) => (
                      <Card
                        key={variant.id || `${variant.configuration}-${index}`}
                        className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <Badge className="border-0 bg-blue-50 text-xs font-extrabold text-blue-700">
                              {variant.configuration}
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">
                              {variant.carpetArea} sq.ft.
                            </span>
                          </div>

                          <div className="mt-4">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Carpet Area
                            </p>
                            <p className="text-xl font-black text-secondary">
                              {variant.carpetArea}{" "}
                              <span className="text-xs font-bold">sq.ft.</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Starting Price
                          </p>
                          <p className="text-sm font-extrabold text-primary">
                            {variant.priceAmount
                              ? `${variant.priceAmount} ${variant.priceUnit} Onwards`
                              : "On Request"}
                          </p>
                        </div>
                      </Card>
                    ),
                  )
                ) : (
                  <Card className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-semibold text-muted-foreground">
                    No layout configuration variants available for this filter.
                  </Card>
                )}
              </div>
            </section>

            {/* Video Walkthrough & Virtual Tour Section */}
            <Card
              id="videos-section"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs p-1">
                  <Video className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-secondary">
                    Video Walkthrough & Virtual Tour
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                    Official video tour and walkthrough for {project.name}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {videoList.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-xs">
                      {activeVideoEmbedUrl ? (
                        <iframe
                          src={activeVideoEmbedUrl}
                          title={`${project.name} Video Tour`}
                          className="aspect-video w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : activeVideoUrl?.match(
                          /\.(mp4|webm|mov|m4v|ogg|avi)(\?.*)?$/i,
                        ) ||
                        activeVideoUrl?.includes("project-videos") ||
                        (!activeVideoEmbedUrl &&
                          (activeVideoUrl?.startsWith("http://") ||
                            activeVideoUrl?.startsWith("https://"))) ? (
                        <video
                          controls
                          autoPlay={false}
                          src={activeVideoUrl}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center text-white">
                          <Play className="size-10 text-purple-400" />
                          <p className="mt-2 text-xs font-bold truncate max-w-full px-2">
                            Project Tour Video
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 h-8 rounded-lg border-white/20 bg-white/10 text-xs font-bold text-white shadow-none hover:bg-white/20"
                            asChild
                          >
                            <a
                              href={activeVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Watch Video Link
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    {videoList.length > 1 ? (
                      <div className="flex items-center gap-2 overflow-x-auto pt-1">
                        {videoList.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            type="button"
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all",
                              selectedVideoIndex === idx
                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                            )}
                            onClick={() => setSelectedVideoIndex(idx)}
                          >
                            <Play className="size-3" /> Video Tour {idx + 1}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <Video className="size-8 text-slate-300" />
                    <p className="mt-2 text-xs font-extrabold text-secondary">
                      Video Walkthrough Coming Soon
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      Contact our sales team to request a personalized virtual
                      walkthrough.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Amenities Grid */}
            {project.amenities?.length ? (
              <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-secondary">
                  <Sparkles className="size-4 text-primary" />
                  Lifestyle Amenities
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {project.amenities.map((amenity: string) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-100"
                    >
                      <span className="flex size-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-xs">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </span>
                      <span className="text-xs font-extrabold text-secondary">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Key Highlights */}
            {project.highlights?.length ? (
              <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-secondary">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Connectivity & Location Advantages
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.highlights.map((highlight: string) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-100"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          {/* Right Sticky Sidebar (Inquiry & Summary Card) */}
          <aside className="sticky top-24 space-y-6">
            <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <Badge className="border-0 bg-blue-50 text-xs font-extrabold text-blue-700">
                    {project.status || "Active"}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700">
                    <ShieldCheck className="size-3.5" /> Verified Project
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-black tracking-tight text-secondary">
                  {project.name}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <MapPin className="size-3.5 text-slate-400" />
                  {project.location}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Starting Price Range
                  </p>
                  <p className="mt-0.5 text-2xl font-black text-primary">
                    {project.priceRange || "Price on Request"}
                  </p>
                </div>

                <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs font-medium text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Configurations
                    </span>
                    <span className="font-extrabold text-secondary">
                      {configurationsList.join(", ") || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Possession</span>
                    <span className="font-extrabold text-secondary">
                      {project.possession || "Ready to Move"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Developer</span>
                    <span className="font-extrabold text-secondary">
                      {project.developer || "Truroot Realty"}
                    </span>
                  </div>
                  {project.numberOfFloors ? (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Floors</span>
                      <span className="font-extrabold text-secondary">
                        {project.numberOfFloors} Floors
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* CTAs */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full h-11 rounded-xl text-sm font-extrabold shadow-sm gap-2"
                  onClick={handleWhatsAppShare}
                >
                  <Share2 className="size-4" />
                  Share WhatsApp
                </Button>

                {project.brochureUrl || project.brochures?.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-extrabold shadow-none border-slate-200 gap-2"
                    onClick={() => {
                      const url =
                        project.brochureUrl || project.brochures?.[0]?.url;
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <Download className="size-4" />
                    Download Brochure PDF
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-xs font-extrabold text-muted-foreground hover:text-secondary gap-2"
                  onClick={copyShareLink}
                >
                  <Copy className="size-3.5" />
                  {copiedLink ? "Link Copied!" : "Copy Showcase Link"}
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </main>

      {/* Fullscreen Image Lightbox Modal */}
      {isLightboxOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-lg">
          <button
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="size-6" />
          </button>

          <div className="relative flex max-h-full max-w-5xl flex-col items-center justify-center">
            {activePhoto ? (
              <img
                src={activePhoto.url}
                alt={activePhoto.label}
                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : null}

            {galleryItems.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/30"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === 0 ? galleryItems.length - 1 : prev - 1,
                    )
                  }
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/30"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === galleryItems.length - 1 ? 0 : prev + 1,
                    )
                  }
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}

            <div className="mt-4 text-center">
              <p className="text-xs font-extrabold text-white">
                {activePhoto?.label}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">
                {activeImageIndex + 1} of {galleryItems.length}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

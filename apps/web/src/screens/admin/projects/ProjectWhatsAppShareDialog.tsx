import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Copy,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "ui";

import { api } from "../../../common/api";
import type { ProjectCatalogItem } from "./projectsData";
import {
  DEFAULT_PROJECT_WHATSAPP_TEMPLATE,
  PROJECT_WHATSAPP_TEMPLATE_CATEGORY,
  buildWhatsAppShareUrl,
  getProjectShareImages,
  renderProjectWhatsAppTemplate,
} from "./projectWhatsappShare";

interface ProjectShareTemplate {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface CurrentEmployee {
  fullName?: string;
  name?: string;
  phone?: string;
}

interface ProjectWhatsAppShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectCatalogItem | null;
}

function useProjectWhatsappTemplates() {
  return useQuery({
    queryKey: ["lead-masters", PROJECT_WHATSAPP_TEMPLATE_CATEGORY],
    queryFn: async () => {
      const response = await api.get<{ data?: ProjectShareTemplate[] }>(
        `/lead-masters/${PROJECT_WHATSAPP_TEMPLATE_CATEGORY}`,
        { params: { limit: 100 } },
      );
      return (response.data.data ?? []).filter((template) => template.isActive);
    },
  });
}

function useCurrentEmployee() {
  return useQuery({
    queryKey: ["employees", "me", "project-whatsapp-share"],
    queryFn: async () => (await api.get<CurrentEmployee>("/employees/me")).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function ProjectWhatsAppShareDialog({
  open,
  onOpenChange,
  project,
}: ProjectWhatsAppShareDialogProps) {
  const templatesQuery = useProjectWhatsappTemplates();
  const currentEmployeeQuery = useCurrentEmployee();
  const projectImages = useMemo(
    () => (project ? getProjectShareImages(project) : []),
    [project],
  );
  const templates = useMemo<ProjectShareTemplate[]>(() => {
    const activeTemplates = templatesQuery.data ?? [];
    if (activeTemplates.length > 0) return activeTemplates;
    return [
      {
        id: "default-project-whatsapp-template",
        name: "Default project share",
        description: DEFAULT_PROJECT_WHATSAPP_TEMPLATE,
        isActive: true,
      },
    ];
  }, [templatesQuery.data]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [editableMessage, setEditableMessage] = useState("");

  useEffect(() => {
    if (!open || !project) return;
    setSelectedImageUrls(projectImages.slice(0, 4));
  }, [open, project, projectImages]);

  useEffect(() => {
    if (selectedTemplateId && templates.some((item) => item.id === selectedTemplateId)) {
      return;
    }
    setSelectedTemplateId(templates[0]?.id ?? "");
  }, [selectedTemplateId, templates]);

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const senderName =
    currentEmployeeQuery.data?.fullName ?? currentEmployeeQuery.data?.name;
  const senderPhone = currentEmployeeQuery.data?.phone;
  const renderedMessage = useMemo(() => {
    if (!project) return "";
    return renderProjectWhatsAppTemplate({
      project,
      templateBody: selectedTemplate?.description,
      imageUrls: selectedImageUrls,
      senderName,
      senderPhone,
    });
  }, [project, selectedImageUrls, selectedTemplate?.description, senderName, senderPhone]);

  useEffect(() => {
    if (!open) return;
    setEditableMessage(renderedMessage);
  }, [open, renderedMessage]);

  if (!project) return null;

  const toggleImage = (imageUrl: string) => {
    setSelectedImageUrls((current) =>
      current.includes(imageUrl)
        ? current.filter((item) => item !== imageUrl)
        : [...current, imageUrl],
    );
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(editableMessage);
      toast.success("Project share message copied");
    } catch {
      toast.error("Could not copy message. Select the preview text manually.");
    }
  };

  const openWhatsApp = () => {
    window.open(buildWhatsAppShareUrl(editableMessage), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,760px)] w-[min(94vw,70rem)] max-w-6xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
              <MessageCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-extrabold text-secondary">
                Share project on WhatsApp
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-semibold text-muted-foreground">
                Confirm the preview before opening WhatsApp Web. A single clean
                public gallery link is included for project photos and details.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b border-slate-100 bg-slate-50/60 lg:border-b-0 lg:border-r">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-5">
              <section className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  Project summary
                </p>
                <h3 className="mt-2 text-base font-extrabold text-secondary">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {project.developer} - {project.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="border-0 bg-blue-50 text-blue-700">
                    {project.priceRange}
                  </Badge>
                  <Badge className="border-0 bg-slate-100 text-secondary">
                    {project.possession}
                  </Badge>
                </div>
              </section>

              <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-secondary">
                      Message template
                    </label>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Admins manage default templates from Project Masters.
                  </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-md px-3 text-xs shadow-none"
                    onClick={() => {
                      window.open(
                        "/projects/masters?category=project_whatsapp_template",
                        "_self",
                      );
                    }}
                  >
                    Edit template
                  </Button>
                </div>
                <div>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger className="mt-2 h-10 rounded-md text-sm shadow-none">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs font-semibold leading-5 text-muted-foreground">
                  Template path: Projects &gt; Masters &gt; Project WhatsApp
                  Template. You can still edit this message before sharing.
                </p>
              </section>

              <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-secondary">
                      Project images
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedImageUrls.length} selected
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-md px-2 text-xs"
                    onClick={() =>
                      setSelectedImageUrls(
                        selectedImageUrls.length === projectImages.length
                          ? []
                          : projectImages,
                      )
                    }
                  >
                    {selectedImageUrls.length === projectImages.length
                      ? "Clear"
                      : "Select all"}
                  </Button>
                </div>

                {projectImages.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-muted-foreground">
                    No project images available.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {projectImages.map((imageUrl, index) => {
                      const checked = selectedImageUrls.includes(imageUrl);
                      return (
                        <button
                          key={imageUrl}
                          type="button"
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-md border bg-slate-100 text-left transition-colors",
                            checked
                              ? "border-primary ring-2 ring-primary/15"
                              : "border-slate-200 hover:border-slate-300",
                          )}
                          title={imageUrl}
                          onClick={() => toggleImage(imageUrl)}
                        >
                          <img
                            src={imageUrl}
                            alt={`${project.name} share image ${index + 1}`}
                            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <span
                            className={cn(
                              "absolute left-2 top-2 flex size-6 items-center justify-center rounded-md border text-white",
                              checked
                                ? "border-primary bg-primary"
                                : "border-white/80 bg-black/30",
                            )}
                          >
                            <Checkbox checked={checked} readOnly />
                          </span>
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6 text-[10px] font-extrabold text-white">
                            {index === 0 ? "Cover" : `Image ${index + 1}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-h-0 flex-col bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-secondary">
                  Editable WhatsApp message
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  Maps and coordinate fields are intentionally excluded.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md px-3 text-xs shadow-none"
                  onClick={() => setEditableMessage(renderedMessage)}
                >
                  Reset to template
                </Button>
                <span className="flex size-9 items-center justify-center rounded-md bg-slate-50 text-muted-foreground">
                  <ImageIcon className="size-4" />
                </span>
              </div>
            </div>
            <Textarea
              value={editableMessage}
              onChange={(event) => setEditableMessage(event.target.value)}
              className="min-h-0 flex-1 resize-none rounded-none border-0 bg-white p-5 font-mono text-xs leading-6 shadow-none focus-visible:ring-0"
            />
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs font-semibold leading-5 text-muted-foreground">
            WhatsApp Web cannot attach files from a URL automatically, so image
            and brochure links are included in the message.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md shadow-none"
              onClick={copyMessage}
            >
              <Copy className="size-4" />
              Copy message
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md"
              onClick={openWhatsApp}
            >
              <ExternalLink className="size-4" />
              Open WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

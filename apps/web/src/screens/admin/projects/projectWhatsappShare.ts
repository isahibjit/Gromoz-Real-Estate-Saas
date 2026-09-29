import {
  getProjectImageGallery,
  type ProjectCatalogItem,
} from "./projectsData";

export const PROJECT_WHATSAPP_TEMPLATE_CATEGORY =
  "project_whatsapp_template";

const LEGACY_PROJECT_WHATSAPP_TEMPLATE = [
  "Greetings from {{developer}}",
  "",
  "*{{projectName}}*",
  "",
  "{{description}}",
  "",
  "Configurations",
  "{{configurations}}",
  "",
  "Price",
  "{{priceRange}} onwards",
  "",
  "Possession",
  "{{possession}}",
  "",
  "Amenities",
  "{{amenities}}",
  "",
  "Highlights",
  "{{highlights}}",
  "",
  "Project Location",
  "{{location}}",
  "",
  "Project Images",
  "{{imageLinks}}",
  "",
  "Project Brochure",
  "{{brochureLink}}",
  "",
  "Thanks and Regards",
  "{{senderName}}",
  "{{senderPhone}}",
].join("\n");

export const DEFAULT_PROJECT_WHATSAPP_TEMPLATE = [
  "*{{projectName}}*",
  "",
  "We are thrilled to introduce *{{projectName}}*, a residential project by the Developer *{{developer}}*, located at {{location}}.",
  "",
  "Offering {{configurations}} apartments.",
  "",
  "{{configurationSection}}",
  "{{possessionSection}}",
  "{{numberOfFloorsSection}}",
  "",
  "{{amenitiesSection}}",
  "{{mediaSection}}",
  "",
  "Best regards,",
  "{{senderName}}",
  "{{senderPhone}}",
].join("\n");

export const PROJECT_WHATSAPP_TEMPLATE_VARIABLES = [
  { label: "Project name", token: "{{projectName}}" },
  { label: "Developer", token: "{{developer}}" },
  { label: "Location", token: "{{location}}" },
  { label: "Description", token: "{{description}}" },
  { label: "Price range", token: "{{priceRange}}" },
  { label: "Possession", token: "{{possession}}" },
  { label: "Number of floors", token: "{{numberOfFloors}}" },
  { label: "Number of floors section", token: "{{numberOfFloorsSection}}" },
  { label: "Configurations", token: "{{configurations}}" },
  { label: "Configuration carpet areas", token: "{{configurationDetails}}" },
  { label: "Amenities", token: "{{amenities}}" },
  { label: "Highlights", token: "{{highlights}}" },
  { label: "Image link", token: "{{imageLinks}}" },
  { label: "Brochure link", token: "{{brochureLink}}" },
  { label: "Video link", token: "{{videoLink}}" },
  { label: "Configuration section", token: "{{configurationSection}}" },
  { label: "Price section", token: "{{priceSection}}" },
  { label: "Highlights section", token: "{{highlightsSection}}" },
  { label: "Amenities section", token: "{{amenitiesSection}}" },
  { label: "Possession section", token: "{{possessionSection}}" },
  { label: "Media section", token: "{{mediaSection}}" },
  { label: "Sender name", token: "{{senderName}}" },
  { label: "Sender phone", token: "{{senderPhone}}" },
] as const;

interface RenderProjectShareTemplateArgs {
  project: ProjectCatalogItem;
  templateBody?: string;
  imageUrls: string[];
  senderName?: string;
  senderPhone?: string;
}

const mapLikeLinePattern =
  /(google\.com\/maps|maps\.google|goo\.gl\/maps|latitude|longitude|\blat\b|\blng\b|geofence|map url|map link|coordinates)/i;

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatList(values: readonly string[] | undefined) {
  const items = uniqueStrings([...(values ?? [])]);
  if (items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

function createSection(title: string, content: string) {
  return content.trim() ? `*${title}*\n${content.trim()}\n` : "";
}

function getConfigurationDetails(project: ProjectCatalogItem) {
  const variants = (project.configurationVariants ?? [])
    .filter((variant) => variant.configuration.trim())
    .map((variant) => {
      const details = [
        variant.carpetArea.trim() ? `${variant.carpetArea.trim()} sq.ft.` : "",
        variant.priceAmount.trim()
          ? `${variant.priceAmount.trim()} ${variant.priceUnit} Onwards`
          : "",
      ].filter(Boolean);
      return `- *${variant.configuration.trim()}*${details.length ? ` - ${details.join(" - ")}` : ""}`;
    });
  if (variants.length > 0) return variants.join("\n");

  const configuredAreas = Object.entries(project.configurationCarpetAreas ?? {})
    .filter(([configuration, area]) => configuration.trim() && area.trim())
    .map(
      ([configuration, area]) =>
        `- *${configuration.trim()}* - ${area.trim()} sq.ft.`,
    );
  if (configuredAreas.length > 0) return configuredAreas.join("\n");

  const areasByConfiguration = new Map<string, string[]>();

  for (const unit of project.units) {
    const configuration = unit.configuration.trim();
    const carpetArea = unit.carpetArea.trim();
    if (!configuration || configuration === "-" || !carpetArea || carpetArea === "-") {
      continue;
    }
    const values = areasByConfiguration.get(configuration) ?? [];
    values.push(carpetArea);
    areasByConfiguration.set(configuration, values);
  }

  return Array.from(areasByConfiguration.entries())
    .map(([configuration, areas]) => `- *${configuration}* - ${uniqueStrings(areas).join(" | ")}`)
    .join("\n");
}

function stripMapContent(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => !mapLikeLinePattern.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getProjectShareImages(project: ProjectCatalogItem) {
  return uniqueStrings([
    project.imageUrl ?? "",
    ...getProjectImageGallery(project),
  ]);
}

export function renderProjectWhatsAppTemplate({
  project,
  templateBody,
  imageUrls,
  senderName,
  senderPhone,
}: RenderProjectShareTemplateArgs) {
  const configurationDetails = getConfigurationDetails(project);
  const amenities = formatList(project.amenities);
  const highlights = formatList(project.highlights);
  const projectSlug =
    project.name
      ? project.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
      : project.id;
  const publicGalleryUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${projectSlug}`
      : `https://crmtrueroot.com/p/${projectSlug}`;
  const imageLinks = `${publicGalleryUrl}/img`;
  const brochureLinks =
    (project.brochures?.length ? project.brochures[0].url : project.brochureUrl) ||
    `${publicGalleryUrl}/br`;
  const videoLinks =
    (project.videoUrls?.length
      ? project.videoUrls[0]
      : project.videos?.length
      ? project.videos[0]
      : project.videoUrl) || `${publicGalleryUrl}/vd`;

  const priceRange = project.priceRange.trim();
  const possession = project.possession.trim();
  const placeholders: Record<string, string> = {
    projectName: project.name,
    developer: project.developer,
    location: project.location,
    description: project.description,
    priceRange,
    possession,
    numberOfFloors: project.numberOfFloors ? String(project.numberOfFloors) : "",
    numberOfFloorsSection: project.numberOfFloors
      ? `*No. of Floors :* ${project.numberOfFloors}${String(project.numberOfFloors).toLowerCase().includes("storey") ? "" : " Storey"}\n`
      : "",
    configurations: uniqueStrings(project.configurations).join(" & "),
    configurationDetails,
    amenities,
    highlights,
    imageLinks,
    galleryLink: publicGalleryUrl,
    brochureLink: brochureLinks,
    videoLink: videoLinks,
    configurationSection: createSection(
      "Configuration",
      configurationDetails,
    ),
    priceSection: createSection(
      "Price range",
      priceRange ? `*${priceRange}* All Inclusive.` : "",
    ),
    highlightsSection: createSection("Prime connectivity and highlights", highlights),
    amenitiesSection: createSection("Lifestyle amenities", amenities),
    possessionSection: possession ? `*Possession by:* ${possession}.\n` : "",
    mediaSection: [
      "- Media :",
      `image : ${imageLinks}`,
      `brochure : ${brochureLinks}`,
      `video : ${videoLinks}`,
    ].join("\n"),
    senderName: senderName?.trim() || "Admin User",
    senderPhone: senderPhone?.trim() || "",
  };

  const activeTemplate = templateBody?.trim();
  const resolvedTemplate =
    activeTemplate === LEGACY_PROJECT_WHATSAPP_TEMPLATE
      ? DEFAULT_PROJECT_WHATSAPP_TEMPLATE
      : activeTemplate || DEFAULT_PROJECT_WHATSAPP_TEMPLATE;
  const rendered = resolvedTemplate
    .replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return Object.prototype.hasOwnProperty.call(placeholders, key)
        ? placeholders[key]
        : "";
    });

  return stripMapContent(
    rendered
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  );
}

export function buildWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

import {
  FileText,
  Filter,
  Folder,
  FolderOpen,
  MoreVertical,
  Plus,
  Search,
  UploadCloud,
} from "lucide-react";
import { Badge, Button } from "ui";
import type { DocumentItem, LeadDetailsData } from "../leadDetailsTypes";
import { Panel } from "./OverviewTab";

function DocumentStatsCards({ docs }: { docs: DocumentItem[] }) {
  const total = docs.length;

  const stats = [
    {
      label: "Total Documents",
      value: total,
      icon: Folder,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: "Storage Used",
      value: "7.5 MB",
      icon: FolderOpen,
      tone: "text-orange-600 bg-orange-50",
    },
    {
      label: "Recently Uploaded",
      value: 4,
      icon: UploadCloud,
      tone: "text-green-600 bg-green-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Panel key={stat.label} title="">
            <div className="-mt-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-secondary">
                  {stat.value}
                </p>
              </div>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.tone}`}
              >
                <Icon className="h-6 w-6" />
              </span>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function DocumentList({ docs }: { docs: DocumentItem[] }) {
  const getDocType = (name: string) => {
    if (name.includes(".pdf")) return "PDF";
    if (name.includes(".jpg") || name.includes(".png")) return "Image";
    if (name.includes(".docx")) return "Word";
    return "File";
  };

  return (
    <Panel title="All Documents">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-md px-3 text-xs font-extrabold shadow-none"
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>
        <Button className="h-10 gap-2 rounded-md bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Document Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded On</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm font-semibold text-muted-foreground"
                >
                  No documents found.
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="bg-white transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="font-extrabold text-secondary">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className="border-0 bg-slate-100 text-secondary hover:bg-slate-100">
                      {getDocType(doc.name)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 font-bold text-secondary">
                    {doc.size}
                  </td>
                  <td className="px-4 py-4 font-bold text-secondary">
                    {doc.date}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-secondary"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function DocumentsTab({ data }: { data: LeadDetailsData }) {
  const docs = data.documents || [];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DocumentStatsCards docs={docs} />
      <DocumentList docs={docs} />
    </div>
  );
}

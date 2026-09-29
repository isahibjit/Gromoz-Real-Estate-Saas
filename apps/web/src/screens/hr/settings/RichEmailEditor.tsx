import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";

type RichEmailEditorProps = {
  value: string;
  variableTokens: string[];
  onChange: (nextValue: string) => void;
};

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-gray-200 text-gray-500 hover:border-primary/40 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function normalizeHtml(value: string) {
  return (value || "").trim() || "<p></p>";
}

export function RichEmailEditor({
  value,
  variableTokens,
  onChange,
}: RichEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    h2: false,
    ul: false,
    ol: false,
    link: false,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const normalized = normalizeHtml(value);
    if (normalizeHtml(editor.innerHTML) === normalized) return;
    editor.innerHTML = normalized;
  }, [value]);

  const updateToolbarState = () => {
    if (typeof document === "undefined") return;
    setActiveFormats({
      bold: !!document.queryCommandState("bold"),
      italic: !!document.queryCommandState("italic"),
      h2: document.queryCommandValue("formatBlock") === "h2",
      ul: !!document.queryCommandState("insertUnorderedList"),
      ol: !!document.queryCommandState("insertOrderedList"),
      link: !!document.queryCommandState("createLink"),
    });
  };

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = normalizeHtml(editor.innerHTML);
    onChange(html);
    updateToolbarState();
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const toggleHeading = () => {
    editorRef.current?.focus();
    const current = document.queryCommandValue("formatBlock");
    document.execCommand(
      "formatBlock",
      false,
      current === "h2" ? "p" : "h2",
    );
    emitChange();
  };

  const addLink = () => {
    editorRef.current?.focus();
    const url = window.prompt("Enter secured URL target");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      document.execCommand("unlink");
      emitChange();
      return;
    }
    document.execCommand("createLink", false, trimmed);
    emitChange();
  };

  const addImage = () => {
    editorRef.current?.focus();
    const url = window.prompt("Enter image asset URL");
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    document.execCommand("insertImage", false, trimmed);
    emitChange();
  };

  const insertVariable = (token: string) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, `{{${token}}}`);
    emitChange();
  };

  const toolbarConfig = useMemo(
    () => [
      {
        label: "Undo",
        active: false,
        onClick: () => runCommand("undo"),
        icon: <Undo2 size={14} />,
      },
      {
        label: "Redo",
        active: false,
        onClick: () => runCommand("redo"),
        icon: <Redo2 size={14} />,
      },
      {
        label: "Heading",
        active: activeFormats.h2,
        onClick: toggleHeading,
        icon: <Heading2 size={14} />,
      },
      {
        label: "Bold",
        active: activeFormats.bold,
        onClick: () => runCommand("bold"),
        icon: <Bold size={14} />,
      },
      {
        label: "Italic",
        active: activeFormats.italic,
        onClick: () => runCommand("italic"),
        icon: <Italic size={14} />,
      },
      {
        label: "Add Link",
        active: activeFormats.link,
        onClick: addLink,
        icon: <Link2 size={14} />,
      },
      {
        label: "Bullet List",
        active: activeFormats.ul,
        onClick: () => runCommand("insertUnorderedList"),
        icon: <List size={14} />,
      },
      {
        label: "Ordered List",
        active: activeFormats.ol,
        onClick: () => runCommand("insertOrderedList"),
        icon: <ListOrdered size={14} />,
      },
      {
        label: "Add Image",
        active: false,
        onClick: addImage,
        icon: <ImagePlus size={14} />,
      },
    ],
    [activeFormats],
  );

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 rounded-t-lg border-b border-gray-200 bg-gray-50/80 p-2">
        {toolbarConfig.slice(0, 2).map((item) => (
          <ToolbarButton
            key={item.label}
            label={item.label}
            active={item.active}
            onClick={item.onClick}
          >
            {item.icon}
          </ToolbarButton>
        ))}
        <div className="mx-1 h-6 w-px border-r border-white bg-gray-300" />
        {toolbarConfig.slice(2, 5).map((item) => (
          <ToolbarButton
            key={item.label}
            label={item.label}
            active={item.active}
            onClick={item.onClick}
          >
            {item.icon}
          </ToolbarButton>
        ))}
        <div className="mx-1 h-6 w-px border-r border-white bg-gray-300" />
        {toolbarConfig.slice(5).map((item) => (
          <ToolbarButton
            key={item.label}
            label={item.label}
            active={item.active}
            onClick={item.onClick}
          >
            {item.icon}
          </ToolbarButton>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[320px] w-full rounded-b-lg border-x border-b border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        onBlur={emitChange}
        onInput={emitChange}
        onKeyUp={updateToolbarState}
        onMouseUp={updateToolbarState}
      />

      {variableTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-b-lg border-x border-b border-gray-200 bg-gray-50 p-3">
          <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Variables:
          </span>
          {variableTokens.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertVariable(token)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium font-mono text-gray-600 transition-all hover:border-primary hover:text-primary hover:shadow-sm"
              title={`Insert {{${token}}} into layout`}
            >
              {`{{${token}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

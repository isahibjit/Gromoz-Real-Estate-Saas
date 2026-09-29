import { useEffect, useRef, type ReactNode } from "react";

import { useDashboardLayoutContext } from "../admin/dashboard/DashboardLayoutContext";
import { fieldExecutiveSidebarItems } from "./fieldExecutiveData";

export function useFieldExecutiveChrome({
  activeItem,
  breadcrumbs,
  search,
  onSearchChange,
  headerContent,
}: {
  activeItem: string;
  breadcrumbs?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  headerContent?: ReactNode;
}) {
  const layout = useDashboardLayoutContext();
  const setHeader = layout?.setHeader;
  const setSidebar = layout?.setSidebar;
  const breadcrumbsRef = useRef(breadcrumbs);
  const headerContentRef = useRef(headerContent);
  breadcrumbsRef.current = breadcrumbs;
  headerContentRef.current = headerContent;

  useEffect(() => {
    if (!setHeader || !setSidebar) return undefined;
    const nextHeader = {
      search,
      onSearchChange,
      breadcrumbs: breadcrumbsRef.current,
      headerContent: headerContentRef.current,
    };
    const nextSidebar = { activeItem, sidebarItems: fieldExecutiveSidebarItems };
    setHeader(nextHeader);
    setSidebar(nextSidebar);
    return () => {
      setHeader((current) => (current === nextHeader ? {} : current));
      setSidebar((current) => (current === nextSidebar ? {} : current));
    };
  }, [activeItem, onSearchChange, search, setHeader, setSidebar]);
}

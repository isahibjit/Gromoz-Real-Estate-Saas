import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { SidebarItem } from "./dashboardData";

export interface DashboardHeaderConfig {
  search?: string;
  onSearchChange?: (value: string) => void;
  breadcrumbs?: ReactNode;
  headerContent?: ReactNode;
}

export interface DashboardSidebarConfig {
  activeItem?: string;
  activeChild?: string;
  sidebarItems?: SidebarItem[];
  sidebarFooter?: ReactNode;
}

interface DashboardLayoutContextValue {
  header: DashboardHeaderConfig;
  sidebar: DashboardSidebarConfig;
  setHeader: Dispatch<SetStateAction<DashboardHeaderConfig>>;
  setSidebar: Dispatch<SetStateAction<DashboardSidebarConfig>>;
}

const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [header, setHeader] = useState<DashboardHeaderConfig>({});
  const [sidebar, setSidebar] = useState<DashboardSidebarConfig>({});
  const value = useMemo(
    () => ({ header, sidebar, setHeader, setSidebar }),
    [header, sidebar],
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export const useDashboardLayoutContext = () =>
  useContext(DashboardLayoutContext);

export function useDashboardLayout(
  config: {
    header?: DashboardHeaderConfig;
    sidebar?: DashboardSidebarConfig;
  },
  dependencies: readonly unknown[] = [],
) {
  const layout = useDashboardLayoutContext();
  const setHeader = layout?.setHeader;
  const setSidebar = layout?.setSidebar;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!setHeader || !setSidebar) return undefined;
    if (config.header) setHeader(config.header);
    if (config.sidebar) setSidebar(config.sidebar);

    return () => {
      if (config.header) {
        setHeader((current) => (current === config.header ? {} : current));
      }
      if (config.sidebar) {
        setSidebar((current) =>
          current === config.sidebar ? {} : current,
        );
      }
    };
  }, [setHeader, setSidebar, ...dependencies]);
}

import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, Moon, Sun, SunMoon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import type { CSSProperties, ReactNode } from "react";

import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon },
] as const;

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/students", label: "Students" },
  { to: "/instructors", label: "Instructors" },
  { to: "/groups", label: "Groups" },
] as const;

type AppShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

function AppShell({ children, title, description }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (open) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, []);

  const handleSidebarResize = useCallback((panelSize: PanelSize) => {
    setSidebarOpen(panelSize.asPercentage > 0.5);
  }, []);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      className="h-svh min-h-0 overflow-hidden bg-background text-foreground"
    >
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel
          id="shell-sidebar"
          panelRef={sidebarPanelRef}
          collapsible
          collapsedSize="0%"
          defaultSize="12%"
          minSize="10%"
          maxSize="20%"
          className="min-h-0 min-w-0 overflow-hidden"
          onResize={handleSidebarResize}
        >
          <Sidebar
            collapsible="none"
            className="h-full overflow-hidden border-r border-sidebar-border"
            style={{ "--sidebar-width": "100%" } as CSSProperties}
          >
            <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-4">
              <Link
                to="/"
                className="self-start rounded-md bg-sidebar-primary px-1.5 py-1 font-heading text-xs font-semibold tracking-tight text-sidebar-primary-foreground"
              >
                Carve Ski School
              </Link>
              <p className="text-[0.625rem] leading-snug text-sidebar-foreground/80">
                Lesson roster &amp; placement
              </p>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {nav.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          render={
                            <Link
                              to={item.to}
                              activeOptions={{
                                exact: item.to === "/",
                              }}
                              activeProps={{
                                "data-active": "true",
                              }}
                              inactiveProps={{
                                "data-active": "false",
                              }}
                            />
                          }
                        >
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <SidebarMenuButton
                          size="lg"
                          className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                        />
                      }
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                        CS
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-medium">
                          Ski School Admin
                        </p>
                        <p className="truncate text-[0.625rem] text-sidebar-foreground/60">
                          admin@carve.ski
                        </p>
                      </div>
                      <ChevronsUpDown className="ml-auto shrink-0 text-sidebar-foreground/50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      className="w-52"
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                          <DropdownMenuItem
                            key={value}
                            onClick={() => setTheme(value)}
                            className={cn(
                              theme === value &&
                                "bg-accent text-accent-foreground"
                            )}
                          >
                            <Icon />
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="shell-main"
          defaultSize="78%"
          minSize="70%"
          className="min-h-0 min-w-0 overflow-hidden"
        >
          <SidebarInset className="flex h-full flex-col overflow-hidden">
            <header
              className={cn(
                "sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b border-border bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/80",
                title ? "py-4" : "py-2"
              )}
            >
              <SidebarTrigger className="mt-0.5 shrink-0" />
              {title ? (
                <div className="min-w-0 flex-1">
                  <h1 className="font-heading text-lg font-semibold tracking-tight">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-5">
              {children}
            </main>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}

export { AppShell };

import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OfflineStatusBar from "@/components/OfflineStatusBar";

type AppRole = "admin" | "cashier";

interface NavItem {
  to: string;
  label: string;
  roles: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "POS", roles: ["admin", "cashier"] },
  { to: "/customers", label: "Customers", roles: ["admin", "cashier"] },
  { to: "/workflow", label: "Workflow", roles: ["admin", "cashier"] },
  { to: "/scan", label: "Scan", roles: ["admin", "cashier"] },
  { to: "/reports", label: "Reports", roles: ["admin"] },
  { to: "/expenses", label: "Expenses", roles: ["admin"] },
  { to: "/services", label: "Pricing", roles: ["admin"] },
  { to: "/whatsapp", label: "WhatsApp", roles: ["admin"] },
  { to: "/staff", label: "Staff", roles: ["admin"] },
];

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const location = useLocation();

  // Safely try to use auth context - may not be available in all render paths
  let profile: any = null;
  let role: AppRole | null = null;
  let signOut: (() => Promise<void>) | null = null;
  
  try {
    const auth = useAuth();
    profile = auth.profile;
    role = auth.role;
    signOut = auth.signOut;
  } catch {
    // Auth context not available (e.g. during initial render)
  }

  const visibleItems = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm print:hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-[1800px] mx-auto">
        {/* Left: Title */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <h1 className="text-base font-bold tracking-tight truncate">{title}</h1>
          {subtitle && (
            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
              {subtitle}
            </span>
          )}
        </div>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Mobile nav */}
        <nav className="flex md:hidden items-center gap-0.5 overflow-x-auto scrollbar-none">
          {visibleItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "px-2 py-1 text-[0.65rem] font-medium rounded whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: User info + Actions */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
          {actions}
          {profile && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{profile.username}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {role}
              </Badge>
              {signOut && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Logout">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
    <OfflineStatusBar />
    </>
  );
}

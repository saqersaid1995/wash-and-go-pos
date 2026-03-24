import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "POS" },
  { to: "/customers", label: "Customers" },
  { to: "/workflow", label: "Workflow" },
  { to: "/scan", label: "Scan" },
  { to: "/reports", label: "Reports" },
  { to: "/expenses", label: "Expenses" },
  { to: "/services", label: "Pricing" },
  { to: "/whatsapp", label: "WhatsApp" },
];

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-side content (e.g. POS order summary or page-specific controls) */
  actions?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const location = useLocation();

  return (
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
          {NAV_ITEMS.map((item) => {
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
          {NAV_ITEMS.map((item) => {
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

        {/* Right: Actions */}
        {actions && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

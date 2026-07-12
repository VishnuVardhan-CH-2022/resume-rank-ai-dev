import { NavLink } from "react-router-dom";

const links = [
  { to: "/jobs", label: "Jobs", end: true },
  { to: "/analytics", label: "Analytics", end: true },
] as const;

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-5">
        <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          ResumeRank AI
        </p>
        <p className="mt-1 text-xs text-sidebar-foreground/60">
          HR screening workspace
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              [
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

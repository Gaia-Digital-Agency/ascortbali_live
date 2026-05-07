import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin/logged",       label: "DASHBOARD" },
  { to: "/admin/logged/blogs", label: "BLOGS" },
];

export function AdminTabs() {
  return (
    <nav className="mb-6 flex flex-wrap justify-center gap-2 text-xs tracking-[0.18em]">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            "min-h-[44px] inline-flex items-center justify-center rounded-full border px-4 py-2 " +
            (isActive
              ? "border-brand-gold bg-brand-gold/20 text-brand-text"
              : "border-brand-line text-brand-muted hover:border-brand-gold hover:text-brand-text")
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

import { Link, useLocation, useNavigate } from "react-router-dom";

type CreatorFilterControlsProps = {
  selectedNationality: string;
  selectedAge: string;
  selectedHeight: string;
  nationalityOptions: string[];
  ageOptions: string[];
  heightOptions: string[];
  className?: string;
};

export function CreatorFilterControls({
  selectedNationality,
  selectedAge,
  selectedHeight,
  nationalityOptions,
  ageOptions,
  heightOptions,
  className,
}: CreatorFilterControlsProps) {
  const location = useLocation();
  const pathname = location.pathname || "/";
  const navigate = useNavigate();

  const onFilterChange = (next: Partial<{ nationality: string; age: string; height: string }>) => {
    const params = new URLSearchParams(window.location.search);
    if (next.nationality !== undefined) {
      if (next.nationality) params.set("nationality", next.nationality);
      else params.delete("nationality");
    }
    if (next.age !== undefined) {
      if (next.age) params.set("age", next.age);
      else params.delete("age");
    }
    if (next.height !== undefined) {
      if (next.height) params.set("height", next.height);
      else params.delete("height");
    }

    params.delete("page");
    navigate(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${className ?? ""}`}>
        <select
          className="h-11 rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-xs tracking-[0.18em] text-brand-muted"
          value={selectedNationality || ""}
          onChange={(e) => onFilterChange({ nationality: e.target.value })}
          aria-label="Nationality"
        >
          <option value="">ALL NATIONALITIES</option>
          {nationalityOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="h-11 rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-xs tracking-[0.18em] text-brand-muted"
          value={selectedAge || ""}
          onChange={(e) => onFilterChange({ age: e.target.value })}
          aria-label="Age"
        >
          <option value="">ALL AGES</option>
          {ageOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="h-11 rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-xs tracking-[0.18em] text-brand-muted"
          value={selectedHeight || ""}
          onChange={(e) => onFilterChange({ height: e.target.value })}
          aria-label="Height"
        >
          <option value="">ALL HEIGHTS</option>
          {heightOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>
              {option}
            </option>
          ))}
        </select>

        <Link to="/" className="h-11 min-w-[44px] rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-center text-xs tracking-[0.18em] text-brand-muted transition hover:border-brand-gold hover:text-brand-text">
          CLEAR
        </Link>
      </div>
    </div>
  );
}

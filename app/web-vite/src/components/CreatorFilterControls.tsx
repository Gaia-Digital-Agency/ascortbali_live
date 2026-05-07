import { Link, useLocation, useNavigate } from "react-router-dom";

type CreatorFilterControlsProps = {
  selectedNationality: string;
  selectedAge: string;
  selectedHeight: string;
  selectedGender: string;
  selectedServiceArea: string;
  selectedCategory: string;
  nationalityOptions: string[];
  ageOptions: string[];
  heightOptions: string[];
  genderOptions: string[];
  serviceAreaOptions: string[];
  categoryOptions: string[];
  className?: string;
};

// All possible filter keys, used for type-safe URL param diffs.
type FilterKey = "nationality" | "age" | "height" | "gender" | "serviceArea" | "category";

// Capitalize a lower-case option for display ("female" -> "Female",
// "all bali" -> "All Bali"). Source values are pulled from the DB folded
// to lower-case (server-side), so we present them in title case to read
// nicely in the dropdown.
function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function CreatorFilterControls({
  selectedNationality,
  selectedAge,
  selectedHeight,
  selectedGender,
  selectedServiceArea,
  selectedCategory,
  nationalityOptions,
  ageOptions,
  heightOptions,
  genderOptions,
  serviceAreaOptions,
  categoryOptions,
  className,
}: CreatorFilterControlsProps) {
  const location = useLocation();
  const pathname = location.pathname || "/";
  const navigate = useNavigate();

  const onFilterChange = (next: Partial<Record<FilterKey, string>>) => {
    const params = new URLSearchParams(window.location.search);
    (Object.keys(next) as FilterKey[]).forEach((k) => {
      const v = next[k];
      if (v !== undefined) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
    });
    // Any filter change resets to page 1.
    params.delete("page");
    navigate(`${pathname}?${params.toString()}`);
  };

  // Shared <select> styling so adding controls stays painless.
  const selectClass =
    "h-11 rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-xs tracking-[0.18em] text-brand-muted";

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${className ?? ""}`}>
        <select
          className={selectClass}
          value={selectedNationality || ""}
          onChange={(e) => onFilterChange({ nationality: e.target.value })}
          aria-label="Nationality"
        >
          <option value="">ALL NATIONALITIES</option>
          {nationalityOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>{option}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={selectedAge || ""}
          onChange={(e) => onFilterChange({ age: e.target.value })}
          aria-label="Age"
        >
          <option value="">ALL AGES</option>
          {ageOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>{option}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={selectedHeight || ""}
          onChange={(e) => onFilterChange({ height: e.target.value })}
          aria-label="Height"
        >
          <option value="">ALL HEIGHTS</option>
          {heightOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>{option}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={selectedGender || ""}
          onChange={(e) => onFilterChange({ gender: e.target.value })}
          aria-label="Gender"
        >
          <option value="">ALL GENDERS</option>
          {genderOptions.map((option) => (
            <option key={option} value={option}>{titleCase(option)}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={selectedServiceArea || ""}
          onChange={(e) => onFilterChange({ serviceArea: e.target.value })}
          aria-label="Service area"
        >
          <option value="">ALL AREAS</option>
          {serviceAreaOptions.map((option) => (
            <option key={option} value={option.toLowerCase()}>{titleCase(option)}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={selectedCategory || ""}
          onChange={(e) => onFilterChange({ category: e.target.value })}
          aria-label="Category"
        >
          <option value="">ALL CATEGORIES</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>{titleCase(option)}</option>
          ))}
        </select>

        <Link
          to="/"
          className="h-11 min-w-[44px] rounded-full border border-brand-line bg-brand-bg/70 px-4 py-3 text-center text-xs tracking-[0.18em] text-brand-muted transition hover:border-brand-gold hover:text-brand-text"
        >
          CLEAR
        </Link>
      </div>
    </div>
  );
}

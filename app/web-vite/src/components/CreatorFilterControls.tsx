import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type CreatorFilterControlsProps = {
  selectedName: string;
  selectedAge: string;
  selectedHeight: string;
  selectedGender: string;
  selectedServiceArea: string;
  selectedCategory: string;
  nameOptions: string[];
  ageOptions: string[];
  // Height options are 2-inch bands: { value: <min-inches>, label: '5\'4" - 5\'5" / 163-167 cm' }
  heightOptions: Array<{ value: string; label: string }>;
  genderOptions: string[];
  serviceAreaOptions: string[];
  categoryOptions: string[];
  className?: string;
};

// All possible filter keys, used for type-safe URL param diffs.
type FilterKey = "name" | "age" | "height" | "gender" | "serviceArea" | "category";

// Capitalize a lower-case option for display ("female" -> "Female",
// "all bali" -> "All Bali"). Source values are pulled from the DB folded
// to lower-case (server-side), so we present them in title case to read
// nicely in the dropdown.
function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function CreatorFilterControls({
  selectedName,
  selectedAge,
  selectedHeight,
  selectedGender,
  selectedServiceArea,
  selectedCategory,
  nameOptions,
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

  // Local input state for the name search so we don't navigate on every
  // keystroke; commit on Enter, on blur, or when an autocomplete option is
  // picked. Re-sync if the URL's name param changes (e.g. CLEAR).
  const [nameInput, setNameInput] = useState(selectedName);
  useEffect(() => { setNameInput(selectedName); }, [selectedName]);

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
    <div className={`space-y-3 ${className ?? ""}`}>
      {/* Six filters arranged as two rows of three on md+; two columns on
          mobile (so three stacked rows). The CLEAR button sits on a final
          row aligned to the right so it's always the bottom-right control. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <input
          className={`${selectClass} placeholder:text-brand-muted/60`}
          type="search"
          list="creator-name-options"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onFilterChange({ name: nameInput.trim() }); }}
          onBlur={() => { if (nameInput.trim() !== selectedName) onFilterChange({ name: nameInput.trim() }); }}
          placeholder="SEARCH GIRL'S NAME"
          aria-label="Search by name"
        />
        <datalist id="creator-name-options">
          {nameOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

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
            <option key={option.value} value={option.value}>{option.label}</option>
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

      </div>

      <div className="flex justify-end">
        <Link
          to="/"
          className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-brand-line bg-brand-bg/70 px-6 py-3 text-xs tracking-[0.18em] text-brand-muted transition hover:border-brand-gold hover:text-brand-text"
        >
          CLEAR
        </Link>
      </div>
    </div>
  );
}

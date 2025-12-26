import {
  backgroundOptions,
  fontOptions,
  themeOptions,
  type ThemeType,
} from '../domain/themeCatalog';

interface ThemePickerProps {
  themeKey: ThemeType;
  backgroundKey: string;
  fontKey: string;
  onThemeChange: (value: ThemeType) => void;
  onBackgroundChange: (value: string) => void;
  onFontChange: (value: string) => void;
}

const ThemePicker = ({
  themeKey,
  backgroundKey,
  fontKey,
  onThemeChange,
  onBackgroundChange,
  onFontChange,
}: ThemePickerProps) => {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Theme
        <select
          className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
          value={themeKey}
          onChange={(event) => onThemeChange(event.target.value as ThemeType)}
        >
          {themeOptions.map((theme) => (
            <option key={theme.key} value={theme.key}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Background
        <select
          className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
          value={backgroundKey}
          onChange={(event) => onBackgroundChange(event.target.value)}
        >
          {backgroundOptions.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.name.en}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Font
        <select
          className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
          value={fontKey}
          onChange={(event) => onFontChange(event.target.value)}
        >
          {fontOptions.map((font) => (
            <option key={font.id} value={font.id}>
              {font.name.en}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default ThemePicker;

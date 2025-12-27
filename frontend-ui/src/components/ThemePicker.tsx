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
      <label className="flex flex-col gap-2 text-xs text-slate-600">
        <span className="ar-label">Theme</span>
        <select
          className="ar-select w-44"
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

      <label className="flex flex-col gap-2 text-xs text-slate-600">
        <span className="ar-label">Background</span>
        <select
          className="ar-select w-44"
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

      <label className="flex flex-col gap-2 text-xs text-slate-600">
        <span className="ar-label">Font</span>
        <select
          className="ar-select w-44"
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

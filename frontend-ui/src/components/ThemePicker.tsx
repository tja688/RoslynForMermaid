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
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
      <label className="flex items-center gap-3">
        <span className="ar-label !mb-0 whitespace-nowrap">Theme</span>
        <select
          className="ar-select w-36"
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

      <label className="flex items-center gap-3">
        <span className="ar-label !mb-0 whitespace-nowrap">Background</span>
        <select
          className="ar-select w-36"
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

      <label className="flex items-center gap-3">
        <span className="ar-label !mb-0 whitespace-nowrap">Font</span>
        <select
          className="ar-select w-36"
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

import { backgrounds } from './backgrounds';
import { fonts } from './fonts';
import { themes, type ThemeConfig, type ThemeType } from './themes';

export type { BackgroundStyle } from './backgrounds';
export type { FontOption } from './fonts';
export type { ThemeConfig, ThemeType } from './themes';

export interface ThemeOption extends ThemeConfig {
  key: ThemeType;
}

const themeKeys: ThemeType[] = [
  'cyberpunk',
  'handDrawn',
  'spotless',
  'linearLight',
  'linearDark',
];

export const themeOptions: ThemeOption[] = themeKeys.map((key) => ({
  key,
  ...themes[key],
}));

export const backgroundOptions = backgrounds;
export const fontOptions = fonts;

export const themeCatalog = {
  themes: themeOptions,
  backgrounds: backgroundOptions,
  fonts: fontOptions,
};

export const getThemeConfig = (key: ThemeType): ThemeConfig => themes[key];

export const getBackgroundById = (id: string) =>
  backgrounds.find((item) => item.id === id) ?? backgrounds[0];

export const getFontById = (id: string) =>
  fonts.find((item) => item.id === id) ?? fonts[0];

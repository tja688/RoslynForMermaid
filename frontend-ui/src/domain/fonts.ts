export interface FontOption {
  id: string;
  name: {
    'en': string;
    'zh-CN': string;
    'zh-TW': string;
    'ja': string;
    'es': string;
    'pt': string;
  };
  fontFamily: string;
  previewText: {
    'en': string;
    'zh-CN': string;
    'zh-TW': string;
    'ja': string;
    'es': string;
    'pt': string;
  };
}

export const fonts: FontOption[] = [
  {
    id: 'default',
    name: {
      'en': 'Default (Theme)',
      'zh-CN': '默认（主题）',
      'zh-TW': '預設（主題）',
      'ja': 'デフォルト（テーマ）',
      'es': 'Por defecto (Tema)',
      'pt': 'Padrão (Tema)',
    },
    fontFamily: '',
    previewText: {
      'en': 'Default Font',
      'zh-CN': '默认字体',
      'zh-TW': '預設字體',
      'ja': 'デフォルトフォント',
      'es': 'Fuente predeterminada',
      'pt': 'Fonte padrão',
    },
  },
  {
    id: 'inter',
    name: {
      'en': 'Inter (Modern)',
      'zh-CN': 'Inter（现代）',
      'zh-TW': 'Inter（現代）',
      'ja': 'Inter（モダン）',
      'es': 'Inter (Moderno)',
      'pt': 'Inter (Moderno)',
    },
    fontFamily: '"Inter", "Noto Sans SC", sans-serif',
    previewText: {
      'en': 'Inter Font',
      'zh-CN': 'Inter 字体',
      'zh-TW': 'Inter 字體',
      'ja': 'Inter フォント',
      'es': 'Fuente Inter',
      'pt': 'Fonte Inter',
    },
  },
  {
    id: 'mono',
    name: {
      'en': 'JetBrains Mono',
      'zh-CN': 'JetBrains Mono（编程）',
      'zh-TW': 'JetBrains Mono（編程）',
      'ja': 'JetBrains Mono（コード）',
      'es': 'JetBrains Mono (Código)',
      'pt': 'JetBrains Mono (Código)',
    },
    fontFamily: '"JetBrains Mono", "Noto Sans SC", monospace',
    previewText: {
      'en': 'Mono Font',
      'zh-CN': '等宽字体',
      'zh-TW': '等寬字體',
      'ja': 'モノフォント',
      'es': 'Fuente Mono',
      'pt': 'Fonte Mono',
    },
  },
  {
    id: 'serif',
    name: {
      'en': 'Noto Serif (Elegant)',
      'zh-CN': 'Noto Serif（优雅）',
      'zh-TW': 'Noto Serif（優雅）',
      'ja': 'Noto Serif（エレガント）',
      'es': 'Noto Serif (Elegante)',
      'pt': 'Noto Serif (Elegante)',
    },
    fontFamily: '"Noto Serif SC", "Noto Sans SC", serif',
    previewText: {
      'en': 'Serif Font',
      'zh-CN': '衬线字体',
      'zh-TW': '襯線字體',
      'ja': 'セリフフォント',
      'es': 'Fuente Serif',
      'pt': 'Fonte Serif',
    },
  },
  {
    id: 'handwriting',
    name: {
      'en': 'Caveat (Handwriting)',
      'zh-CN': 'Caveat（手写）',
      'zh-TW': 'Caveat（手寫）',
      'ja': 'Caveat（手書き）',
      'es': 'Caveat (Manuscrita)',
      'pt': 'Caveat (Manuscrita)',
    },
    fontFamily: '"Caveat", "Patrick Hand", cursive',
    previewText: {
      'en': 'Handwriting',
      'zh-CN': '手写字体',
      'zh-TW': '手寫字體',
      'ja': '手書きフォント',
      'es': 'Manuscrita',
      'pt': 'Manuscrita',
    },
  },
  {
    id: 'rounded',
    name: {
      'en': 'Nunito (Rounded)',
      'zh-CN': 'Nunito（圆润）',
      'zh-TW': 'Nunito（圓潤）',
      'ja': 'Nunito（丸み）',
      'es': 'Nunito (Redondeada)',
      'pt': 'Nunito (Arredondada)',
    },
    fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
    previewText: {
      'en': 'Rounded Font',
      'zh-CN': '圆润字体',
      'zh-TW': '圓潤字體',
      'ja': '丸みフォント',
      'es': 'Fuente redondeada',
      'pt': 'Fonte arredondada',
    },
  },
  {
    id: 'system',
    name: {
      'en': 'System Default',
      'zh-CN': '系统默认',
      'zh-TW': '系統預設',
      'ja': 'システムデフォルト',
      'es': 'Sistema predeterminado',
      'pt': 'Sistema padrão',
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
    previewText: {
      'en': 'System Font',
      'zh-CN': '系统字体',
      'zh-TW': '系統字體',
      'ja': 'システムフォント',
      'es': 'Fuente del sistema',
      'pt': 'Fonte do sistema',
    },
  },
];


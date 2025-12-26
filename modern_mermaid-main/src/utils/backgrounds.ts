export interface BackgroundStyle {
  id: string;
  name: {
    'en': string;
    'zh-CN': string;
    'zh-TW': string;
    'ja': string;
    'es': string;
    'pt': string;
  };
  bgClass: string;
  bgStyle?: React.CSSProperties;
}

export const backgrounds: BackgroundStyle[] = [
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
    bgClass: '',
    bgStyle: undefined,
  },
  {
    id: 'white',
    name: {
      'en': 'Pure White',
      'zh-CN': '纯白色',
      'zh-TW': '純白色',
      'ja': '純白',
      'es': 'Blanco puro',
      'pt': 'Branco puro',
    },
    bgClass: 'bg-white',
    bgStyle: { backgroundColor: '#ffffff' },
  },
  {
    id: 'black',
    name: {
      'en': 'Pure Black',
      'zh-CN': '纯黑色',
      'zh-TW': '純黑色',
      'ja': '純黒',
      'es': 'Negro puro',
      'pt': 'Preto puro',
    },
    bgClass: 'bg-black',
    bgStyle: { backgroundColor: '#000000' },
  },
  {
    id: 'gray',
    name: {
      'en': 'Light Gray',
      'zh-CN': '浅灰色',
      'zh-TW': '淺灰色',
      'ja': 'ライトグレー',
      'es': 'Gris claro',
      'pt': 'Cinza claro',
    },
    bgClass: 'bg-gray-100',
    bgStyle: { backgroundColor: '#f3f4f6' },
  },
  {
    id: 'blue',
    name: {
      'en': 'Soft Blue',
      'zh-CN': '柔和蓝',
      'zh-TW': '柔和藍',
      'ja': 'ソフトブルー',
      'es': 'Azul suave',
      'pt': 'Azul suave',
    },
    bgClass: 'bg-blue-50',
    bgStyle: { backgroundColor: '#eff6ff' },
  },
  {
    id: 'green',
    name: {
      'en': 'Soft Green',
      'zh-CN': '柔和绿',
      'zh-TW': '柔和綠',
      'ja': 'ソフトグリーン',
      'es': 'Verde suave',
      'pt': 'Verde suave',
    },
    bgClass: 'bg-green-50',
    bgStyle: { backgroundColor: '#f0fdf4' },
  },
  {
    id: 'purple',
    name: {
      'en': 'Soft Purple',
      'zh-CN': '柔和紫',
      'zh-TW': '柔和紫',
      'ja': 'ソフトパープル',
      'es': 'Púrpura suave',
      'pt': 'Roxo suave',
    },
    bgClass: 'bg-purple-50',
    bgStyle: { backgroundColor: '#faf5ff' },
  },
  {
    id: 'gradient-blue',
    name: {
      'en': 'Blue Gradient',
      'zh-CN': '蓝色渐变',
      'zh-TW': '藍色漸變',
      'ja': '青グラデーション',
      'es': 'Degradado azul',
      'pt': 'Gradiente azul',
    },
    bgClass: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    bgStyle: {
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
    },
  },
  {
    id: 'gradient-sunset',
    name: {
      'en': 'Sunset Gradient',
      'zh-CN': '日落渐变',
      'zh-TW': '日落漸變',
      'ja': '夕焼けグラデーション',
      'es': 'Degradado atardecer',
      'pt': 'Gradiente pôr do sol',
    },
    bgClass: 'bg-gradient-to-br from-orange-50 to-pink-100',
    bgStyle: {
      background: 'linear-gradient(to bottom right, #fff7ed, #fce7f3)',
    },
  },
  {
    id: 'dots',
    name: {
      'en': 'Dots Pattern',
      'zh-CN': '圆点图案',
      'zh-TW': '圓點圖案',
      'ja': 'ドットパターン',
      'es': 'Patrón de puntos',
      'pt': 'Padrão de pontos',
    },
    bgClass: 'bg-white',
    bgStyle: {
      backgroundColor: '#ffffff',
      backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
  {
    id: 'grid',
    name: {
      'en': 'Grid Pattern',
      'zh-CN': '网格图案',
      'zh-TW': '網格圖案',
      'ja': 'グリッドパターン',
      'es': 'Patrón de cuadrícula',
      'pt': 'Padrão de grade',
    },
    bgClass: 'bg-white',
    bgStyle: {
      backgroundColor: '#ffffff',
      backgroundImage: `
        linear-gradient(#e5e7eb 1px, transparent 1px),
        linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
      `,
      backgroundSize: '20px 20px',
    },
  },
  {
    id: 'diagonal',
    name: {
      'en': 'Diagonal Lines',
      'zh-CN': '斜线图案',
      'zh-TW': '斜線圖案',
      'ja': '斜線パターン',
      'es': 'Líneas diagonales',
      'pt': 'Linhas diagonais',
    },
    bgClass: 'bg-gray-50',
    bgStyle: {
      backgroundColor: '#f9fafb',
      backgroundImage: `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        #e5e7eb 10px,
        #e5e7eb 11px
      )`,
    },
  },
  {
    id: 'noise',
    name: {
      'en': 'Noise Texture',
      'zh-CN': '噪点纹理',
      'zh-TW': '噪點紋理',
      'ja': 'ノイズテクスチャ',
      'es': 'Textura de ruido',
      'pt': 'Textura de ruído',
    },
    bgClass: 'bg-gray-50',
    bgStyle: {
      backgroundColor: '#f9fafb',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
    },
  },
  {
    id: 'blur-blue',
    name: {
      'en': 'Blurred Blue',
      'zh-CN': '模糊蓝色',
      'zh-TW': '模糊藍色',
      'ja': 'ぼかしブルー',
      'es': 'Azul difuminado',
      'pt': 'Azul desfocado',
    },
    bgClass: 'bg-blue-50',
    bgStyle: {
      backgroundColor: '#eff6ff',
      backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
    },
  },
  {
    id: 'blur-rainbow',
    name: {
      'en': 'Blurred Rainbow',
      'zh-CN': '模糊彩虹',
      'zh-TW': '模糊彩虹',
      'ja': 'ぼかしレインボー',
      'es': 'Arcoíris difuminado',
      'pt': 'Arco-íris desfocado',
    },
    bgClass: 'bg-white',
    bgStyle: {
      backgroundColor: '#ffffff',
      backgroundImage: `
        radial-gradient(circle at 10% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 90% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
      `,
    },
  },
  {
    id: 'pop-art',
    name: {
      'en': 'Pop Art',
      'zh-CN': '波普艺术',
      'zh-TW': '波普藝術',
      'ja': 'ポップアート',
      'es': 'Arte pop',
      'pt': 'Arte pop',
    },
    bgClass: 'bg-yellow-50',
    bgStyle: {
      backgroundColor: '#fefce8',
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(251, 146, 60, 0.1) 50px, rgba(251, 146, 60, 0.1) 100px),
        repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(236, 72, 153, 0.1) 50px, rgba(236, 72, 153, 0.1) 100px)
      `,
    },
  },
  {
    id: 'memphis',
    name: {
      'en': 'Memphis Style',
      'zh-CN': '孟菲斯风格',
      'zh-TW': '孟菲斯風格',
      'ja': 'メンフィススタイル',
      'es': 'Estilo Memphis',
      'pt': 'Estilo Memphis',
    },
    bgClass: 'bg-pink-50',
    bgStyle: {
      backgroundColor: '#fdf2f8',
      backgroundImage: `
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z' fill='%23ec4899' fill-opacity='0.1'/%3E%3C/g%3E%3C/svg%3E")
      `,
    },
  },
  {
    id: 'cyberpunk',
    name: {
      'en': 'Cyberpunk',
      'zh-CN': '赛博朋克',
      'zh-TW': '賽博龐克',
      'ja': 'サイバーパンク',
      'es': 'Ciberpunk',
      'pt': 'Cyberpunk',
    },
    bgClass: 'bg-black',
    bgStyle: {
      backgroundColor: '#000000',
      backgroundImage: `
        linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 255, 0.05) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    },
  },
  {
    id: 'gradient-cosmic',
    name: {
      'en': 'Cosmic Gradient',
      'zh-CN': '宇宙渐变',
      'zh-TW': '宇宙漸變',
      'ja': 'コズミックグラデーション',
      'es': 'Degradado cósmico',
      'pt': 'Gradiente cósmico',
    },
    bgClass: 'bg-gradient-to-br',
    bgStyle: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
    },
  },
  {
    id: 'kawaii',
    name: {
      'en': 'Kawaii',
      'zh-CN': '可爱风',
      'zh-TW': '可愛風',
      'ja': 'かわいい',
      'es': 'Kawaii',
      'pt': 'Kawaii',
    },
    bgClass: 'bg-pink-100',
    bgStyle: {
      backgroundColor: '#fce7f3',
      backgroundImage: `
        radial-gradient(circle at 20% 30%, rgba(251, 207, 232, 0.6) 0%, transparent 30%),
        radial-gradient(circle at 80% 20%, rgba(254, 240, 138, 0.5) 0%, transparent 30%),
        radial-gradient(circle at 60% 80%, rgba(191, 219, 254, 0.5) 0%, transparent 30%)
      `,
    },
  },
  {
    id: 'retro-wave',
    name: {
      'en': 'Retro Wave',
      'zh-CN': '复古蒸汽波',
      'zh-TW': '復古蒸汽波',
      'ja': 'レトロウェーブ',
      'es': 'Onda retro',
      'pt': 'Onda retrô',
    },
    bgClass: 'bg-purple-900',
    bgStyle: {
      backgroundColor: '#581c87',
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(236, 72, 153, 0.3) 2px, rgba(236, 72, 153, 0.3) 4px),
        linear-gradient(180deg, rgba(88, 28, 135, 1) 0%, rgba(147, 51, 234, 0.8) 50%, rgba(236, 72, 153, 0.6) 100%)
      `,
    },
  },
  {
    id: 'paper-texture',
    name: {
      'en': 'Paper Texture',
      'zh-CN': '纸质纹理',
      'zh-TW': '紙質紋理',
      'ja': '紙のテクスチャ',
      'es': 'Textura de papel',
      'pt': 'Textura de papel',
    },
    bgClass: 'bg-amber-50',
    bgStyle: {
      backgroundColor: '#fffbeb',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`,
    },
  },
  {
    id: 'doodle',
    name: {
      'en': 'Doodle',
      'zh-CN': '涂鸦风',
      'zh-TW': '塗鴉風',
      'ja': '落書き',
      'es': 'Garabato',
      'pt': 'Rabisco',
    },
    bgClass: 'bg-white',
    bgStyle: {
      backgroundColor: '#ffffff',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%239333ea' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    },
  },
  {
    id: 'minimalist-dark',
    name: {
      'en': 'Minimalist Dark',
      'zh-CN': '极简深色',
      'zh-TW': '極簡深色',
      'ja': 'ミニマリストダーク',
      'es': 'Oscuro minimalista',
      'pt': 'Escuro minimalista',
    },
    bgClass: 'bg-gray-900',
    bgStyle: {
      backgroundColor: '#111827',
      backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    },
  },
  {
    id: 'aurora',
    name: {
      'en': 'Aurora',
      'zh-CN': '极光',
      'zh-TW': '極光',
      'ja': 'オーロラ',
      'es': 'Aurora',
      'pt': 'Aurora',
    },
    bgClass: 'bg-indigo-950',
    bgStyle: {
      backgroundColor: '#1e1b4b',
      backgroundImage: `
        radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 40%),
        radial-gradient(ellipse at 70% 60%, rgba(168, 85, 247, 0.3) 0%, transparent 40%),
        radial-gradient(ellipse at 50% 80%, rgba(34, 211, 238, 0.2) 0%, transparent 40%)
      `,
    },
  },
  {
    id: 'circuit-board',
    name: {
      'en': 'Circuit Board',
      'zh-CN': '电路板',
      'zh-TW': '電路板',
      'ja': '回路基板',
      'es': 'Placa de circuito',
      'pt': 'Placa de circuito',
    },
    bgClass: 'bg-green-950',
    bgStyle: {
      backgroundColor: '#022c22',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2310b981' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    },
  },
  {
    id: 'watercolor',
    name: {
      'en': 'Watercolor',
      'zh-CN': '水彩',
      'zh-TW': '水彩',
      'ja': '水彩',
      'es': 'Acuarela',
      'pt': 'Aquarela',
    },
    bgClass: 'bg-blue-50',
    bgStyle: {
      backgroundColor: '#eff6ff',
      backgroundImage: `
        radial-gradient(ellipse at 15% 25%, rgba(191, 219, 254, 0.6) 0%, transparent 50%),
        radial-gradient(ellipse at 85% 35%, rgba(196, 181, 253, 0.5) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 75%, rgba(254, 202, 202, 0.4) 0%, transparent 50%),
        radial-gradient(ellipse at 30% 80%, rgba(187, 247, 208, 0.4) 0%, transparent 50%)
      `,
    },
  },
];


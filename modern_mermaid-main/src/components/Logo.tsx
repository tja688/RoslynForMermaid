import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 渐变定义 */}
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 圆角矩形背景 */}
      <rect width="32" height="32" rx="6" fill="url(#logoGrad)"/>
      
      {/* 机器人图标 */}
      <g fill="white">
        {/* 天线 */}
        <rect x="15" y="6" width="2" height="3" rx="1"/>
        <circle cx="16" cy="5" r="1.5"/>
        
        {/* 头部 */}
        <rect x="10" y="9" width="12" height="10" rx="2"/>
        
        {/* 眼睛 */}
        <circle cx="13.5" cy="13" r="1.5" fill="#6366f1"/>
        <circle cx="18.5" cy="13" r="1.5" fill="#6366f1"/>
        
        {/* 嘴巴 */}
        <rect x="13" y="16" width="6" height="1.5" rx="0.75" opacity="0.8"/>
        
        {/* 身体 */}
        <rect x="11" y="20" width="10" height="6" rx="1"/>
        
        {/* 手臂 */}
        <rect x="8" y="21" width="2" height="4" rx="1"/>
        <rect x="22" y="21" width="2" height="4" rx="1"/>
        
        {/* 指示灯 */}
        <circle cx="16" cy="23" r="1" opacity="0.6"/>
      </g>
    </svg>
  );
};

export default Logo;


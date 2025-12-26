import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

const UserNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // 检查用户是否已经同意
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // 延迟显示，让页面先加载完成
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm pointer-events-auto" />
      
      {/* Cookie 同意框 */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              {/* Cookie 图标 */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t.cookieTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t.cookieMessage}
                </p>

                {/* 按钮组 */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={handleAccept}
                    className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {t.cookieAccept}
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-all cursor-pointer"
                  >
                    {t.cookieDecline}
                  </button>
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={handleDecline}
                className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotice;


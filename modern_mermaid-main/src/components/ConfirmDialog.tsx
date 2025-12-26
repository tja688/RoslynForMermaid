import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600',
    },
    warning: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonBg: 'bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* 对话框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full animate-scale-in">
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* 图标 */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            
            {/* 标题 */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>

          {/* 消息 */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 ml-16">
            {message}
          </p>

          {/* 按钮组 */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-all cursor-pointer"
            >
              {cancelText || t.cancel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-5 py-2.5 ${styles.buttonBg} text-white text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer`}
            >
              {confirmText || t.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;


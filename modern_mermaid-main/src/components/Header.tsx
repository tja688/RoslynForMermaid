import { Moon, Sun, Github } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useDarkMode } from '../contexts/DarkModeContext';
import Logo from './Logo';
import DiscordIcon from './DiscordIcon';

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between relative z-50 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <Logo size={40} className="flex-shrink-0" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Modern <span className="text-indigo-600 dark:text-indigo-400">Mermaid</span>
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
        <LanguageSwitcher />
        <a
          href="https://github.com/gotoailab/modern_mermaid"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
          aria-label="Visit our GitHub repository"
          title="Visit our GitHub repository"
          style={{ marginRight: '-8px' }}
        >
          <Github 
            size={20} 
            className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" 
          />
        </a>
        <a
          href="https://discord.gg/tGxevHhz"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer group"
          aria-label="Join our Discord community"
          title="Join our Discord community"
        >
          <DiscordIcon 
            size={20} 
            className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" 
          />
        </a>
      </div>
    </header>
  );
};

export default Header;


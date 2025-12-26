import Layout from './components/Layout';
import { LanguageProvider } from './contexts/LanguageContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import GoogleAnalytics from './components/GoogleAnalytics';
import UserNotice from './components/UserNotice';

function App() {
  return (
    <DarkModeProvider>
      <LanguageProvider>
        <GoogleAnalytics />
        <UserNotice />
        <Layout />
      </LanguageProvider>
    </DarkModeProvider>
  );
}

export default App;

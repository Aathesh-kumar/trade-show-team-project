import { useState } from 'react';
import AppStyles from './styles/App.module.css';
import AsideBar from './components/AsideBar';
import Dashboard from './components/DashboardComponents/Dashboard';
import ToolsInventory from './components/ToolsComponents/ToolsInventory';
import RequestLogs from './components/RequestLogsComponents/RequestLogs';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'logs':
        return <RequestLogs />;
      case 'tools':
        return <ToolsInventory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <main className={AppStyles.app}>
        <AsideBar 
          isOpen={isSidebarOpen} 
          onToggle={toggleSidebar}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
        {renderPage()}
      </main>
    </>
  );
}

export default App;
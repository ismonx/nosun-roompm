import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import RoomBookingFrontEnd from './RoomBookingFrontEnd';
import RoomAdminDashboard from './admin/RoomAdminDashboard';

const App: React.FC = () => {
  // 簡易路由：false = 前台預訂, true = 後台管理
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  return (
    <AppProvider>
      {isAdmin ? (
        <RoomAdminDashboard onLogout={() => setIsAdmin(false)} />
      ) : (
        <RoomBookingFrontEnd onAdminLogin={() => setIsAdmin(true)} />
      )}
    </AppProvider>
  );
};

export default App;

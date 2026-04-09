import React, { useState } from 'react'
import { AppProvider } from './context/AppContext'
import RoomBookingFrontEnd from './RoomBookingFrontEnd'
import RoomAdminDashboard from './RoomAdminDashboard'

function App() {
  const [view, setView] = useState('front'); // 'front' | 'admin'

  return (
    <AppProvider>
      {view === 'front' ? (
        <>
          <RoomBookingFrontEnd />
          <button 
            onClick={() => setView('admin')}
            className="fixed bottom-4 right-4 text-[10px] opacity-20 hover:opacity-100 transition-opacity bg-hostel-olive text-hostel-bg px-2 py-1 rounded"
          >
            ADMIN
          </button>
        </>
      ) : (
        <RoomAdminDashboard onLogout={() => setView('front')} />
      )}
    </AppProvider>
  )
}

export default App

import React from 'react';
import { useApp } from '../contexts/AppContext';
import Notification from './Notification';

const NotificationContainer: React.FC = () => {
  const { state, dispatch } = useApp();

  const handleClose = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {state.notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;

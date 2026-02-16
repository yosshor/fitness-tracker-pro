
import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Toast } from './UI';

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 end-4 z-[60] flex flex-col gap-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

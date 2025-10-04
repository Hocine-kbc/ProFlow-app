import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationProps {
  notification: NotificationData;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  // Durées différentes selon le type de notification
  const getDefaultDuration = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 2000; // 2 secondes pour les succès
      case 'error':
        return 4000; // 4 secondes pour les erreurs (plus importantes)
      case 'warning':
        return 3500; // 3.5 secondes pour les avertissements
      case 'info':
        return 2500; // 2.5 secondes pour les infos
      default:
        return 2500;
    }
  };

  const { id, type, title, message, duration = getDefaultDuration(type) } = notification;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    // Animation de la barre de progression
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 50));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-800 border-green-200 dark:border-green-600';
      case 'error':
        return 'bg-red-50 dark:bg-red-800 border-red-200 dark:border-red-600';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-800 border-yellow-200 dark:border-yellow-600';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-800 border-blue-200 dark:border-blue-600';
      default:
        return 'bg-blue-50 dark:bg-blue-800 border-blue-200 dark:border-blue-600';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-100';
      case 'error':
        return 'text-red-800 dark:text-red-100';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-100';
      case 'info':
        return 'text-blue-800 dark:text-blue-100';
      default:
        return 'text-blue-800 dark:text-blue-100';
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className={`${getBackgroundColor()} border rounded-lg shadow-lg p-4 max-w-sm w-full relative overflow-hidden`}>
        {/* Barre de progression */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${getTextColor()}`}>
              {title}
            </h4>
            {message && (
              <p className={`text-sm mt-1 ${getTextColor()}`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={() => onClose(id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
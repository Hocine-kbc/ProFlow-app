import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  confirmText = 'Confirmer',
  cancelText = 'Annuler'
}: AlertModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
          cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconBg: 'bg-green-100',
          button: 'bg-green-600 hover:bg-green-700 text-white',
          cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        };
      default:
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
          cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
      <div className={`${colors.bg} ${colors.border} border-2 rounded-2xl shadow-2xl max-w-[92vw] sm:max-w-md w-full transform transition-all duration-300 scale-100`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`${colors.iconBg} p-1.5 sm:p-2 rounded-full`}>
              {getIcon()}
            </div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6">
          <p className="text-xs sm:text-base text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex space-x-2 p-3 sm:p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-3 sm:px-4 py-2 rounded-full font-medium transition-all duration-200 text-sm sm:text-base ${colors.cancelButton}`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-3 sm:px-4 py-2 rounded-full font-medium transition-all duration-200 text-sm sm:text-base ${colors.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

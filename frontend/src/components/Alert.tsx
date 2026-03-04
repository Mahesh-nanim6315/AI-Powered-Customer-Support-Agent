import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import '../components/alert.css';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ type = 'info', title, children, onClose }: AlertProps) {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div className={`alert alert--${type}`}>
      <div className="alert-header">
        <div className="alert-icon">{icons[type]}</div>
        {title && <h4 className="alert-title">{title}</h4>}
        {onClose && (
          <button className="alert-close" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="alert-content">{children}</div>
    </div>
  );
}

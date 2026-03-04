import { TextareaHTMLAttributes } from 'react';
import '../components/textarea.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, ...props }: TextAreaProps) {
  return (
    <div className="textarea-wrapper">
      {label && <label className="textarea-label">{label}</label>}
      <textarea className={`textarea ${error ? 'textarea--error' : ''}`} {...props} />
      {error && <span className="textarea-error">{error}</span>}
    </div>
  );
}

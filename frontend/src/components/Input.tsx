import { InputHTMLAttributes } from 'react';
import '../components/input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input className={`input ${error ? 'input--error' : ''}`} {...props} />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}

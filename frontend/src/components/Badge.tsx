import { ReactNode } from 'react';
import '../components/badge.css';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'primary', size = 'sm' }: BadgeProps) {
  return <span className={`badge badge--${variant} badge--${size}`}>{children}</span>;
}

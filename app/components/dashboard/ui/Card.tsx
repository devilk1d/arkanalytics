import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`bg-[var(--surf)] border border-[var(--b)] rounded-2xl transition-all duration-300 ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

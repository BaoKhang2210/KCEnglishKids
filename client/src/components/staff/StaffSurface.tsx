import type { ReactNode } from 'react';
import '../../styles/staff.css';

/** Staff pages always use the large reading scale, including standalone dialogs. */
export function StaffSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`staff-surface ${className}`}>{children}</div>;
}

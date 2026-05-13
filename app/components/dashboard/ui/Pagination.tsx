import React from 'react';
import AuthDropdown from '@/app/components/auth/AuthDropdown';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = ''
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 ${className}`}>
      <p className="text-xs text-gray-500">
        Showing {startItem}–{endItem} of {totalItems.toLocaleString('en-US')} results
      </p>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-xs text-gray-600 font-medium">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-black transition-colors disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {onPageSizeChange && (
          <AuthDropdown
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            variant="compact"
            className="w-20"
            options={[10, 25, 50, 100].map(s => ({
              label: String(s),
              value: String(s)
            }))}
          />
        )}
      </div>
    </div>
  );
}

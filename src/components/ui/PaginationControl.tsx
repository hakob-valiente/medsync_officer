import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function PaginationControl({ currentPage, totalPages, onPageChange, className = '' }: PaginationControlProps) {
    const [inputValue, setInputValue] = useState(String(currentPage));

    useEffect(() => {
        setInputValue(String(currentPage));
    }, [currentPage]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        const num = parseInt(inputValue, 10);
        if (!isNaN(num) && num >= 1 && num <= Math.max(1, totalPages)) {
            onPageChange(num);
        } else {
            setInputValue(String(currentPage));
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur();
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setInputValue(String(currentPage));
            (e.target as HTMLInputElement).blur();
        }
    };

    const safeTotal = Math.max(1, totalPages);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                title="Previous page"
            >
                <ChevronLeft size={14} />
                Previous
            </button>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    title="Go to page (press Enter)"
                    className="w-10 h-7 text-center rounded-md text-[11px] font-black outline-none transition-all focus:ring-2 cursor-pointer"
                    style={{
                        background: 'var(--bg-wash)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                    }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    of {safeTotal}
                </span>
            </div>

            <button
                onClick={() => onPageChange(Math.min(safeTotal, currentPage + 1))}
                disabled={currentPage >= safeTotal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                title="Next page"
            >
                Next
                <ChevronRight size={14} />
            </button>
        </div>
    );
}

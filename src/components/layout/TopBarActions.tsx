import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TopBarActionsProps {
    children: React.ReactNode;
}

export function TopBarActions({ children }: TopBarActionsProps) {
    const [mounted, setMounted] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const el = document.getElementById('top-bar-actions');
        if (el) {
            setContainer(el);
        } else {
            console.warn('TopBarActions: Target element #top-bar-actions not found');
        }
    }, []);

    if (!mounted || !container) return null;

    return createPortal(children, container);
}

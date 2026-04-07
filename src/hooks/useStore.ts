import { useState, useEffect } from 'react';
import { store } from '../store';
import type { AppState } from '../types';

export function useStore(): AppState {
    const [state, setState] = useState<AppState>(() => store.getState());

    useEffect(() => {
        const unsub = store.subscribe(() => {
            setState(store.getState());
        });
        return unsub;
    }, []);

    return state;
}

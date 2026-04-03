
import { useState, useCallback } from 'react';

export type HistoryEntry<T = any> = {
    state: T;
    actionName: string;
};

type HistoryState<T> = {
    past: HistoryEntry<T>[];
    present: HistoryEntry<T>;
    future: HistoryEntry<T>[];
};

type UseHistoryOptions<T> = {
    initialState: T;
    initialActionName?: string;
    maxHistory?: number;
};

export function useHistory<T>({
    initialState,
    initialActionName = "Initial State",
    maxHistory = 20
}: UseHistoryOptions<T>) {
    const [state, setCanvasState] = useState<HistoryState<T>>({
        past: [],
        present: { state: initialState, actionName: initialActionName },
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;
    const past = state.past;

    const set = useCallback((newStateOrFn: T | ((state: T) => T), actionName: string, skipHistory: boolean = false) => {
        setCanvasState(currentState => {
            const newPresentState = typeof newStateOrFn === 'function' 
                ? (newStateOrFn as (state: T) => T)(currentState.present.state) 
                : newStateOrFn;
            
            if (skipHistory) {
                return {
                    ...currentState,
                    present: { ...currentState.present, state: newPresentState },
                };
            }

            if (JSON.stringify(newPresentState) === JSON.stringify(currentState.present.state)) {
                return currentState;
            }

            const newPast = [...currentState.past, currentState.present];
            if (newPast.length > maxHistory) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: { state: newPresentState, actionName },
                future: [],
            };
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        if (!canUndo) return;

        setCanvasState(currentState => {
            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);
            const newFuture = [currentState.present, ...currentState.future];

            return {
                past: newPast,
                present: previous,
                future: newFuture,
            };
        });
    }, [canUndo]);

    const redo = useCallback(() => {
        if (!canRedo) return;

        setCanvasState(currentState => {
            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);
            const newPast = [...currentState.past, currentState.present];

            if (newPast.length > maxHistory) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: next,
                future: newFuture,
            };
        });
    }, [canRedo, maxHistory]);

    const undoTo = useCallback((index: number) => {
        if (index < 0 || index >= state.past.length) return;

        setCanvasState(currentState => {
            const newPresent = currentState.past[index];
            const newFuture = [...currentState.past.slice(index + 1), currentState.present, ...currentState.future];
            const newPast = currentState.past.slice(0, index);

            return {
                past: newPast,
                present: newPresent,
                future: newFuture,
            };
        });
    }, [state.past]);


    return {
        state: state.present.state,
        setCanvasState: set,
        undo,
        redo,
        undoTo,
        canUndo,
        canRedo,
        past,
    };
}

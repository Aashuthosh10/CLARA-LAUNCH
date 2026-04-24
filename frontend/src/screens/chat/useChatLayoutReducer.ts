import { useCallback, useReducer } from 'react';

export type ChatLayoutMode = 'FULL_TEXT' | 'SPLIT_CARDS';

type LayoutAction =
  | { type: 'SET_LAYOUT'; mode: ChatLayoutMode };

function layoutReducer(state: ChatLayoutMode, action: LayoutAction): ChatLayoutMode {
  switch (action.type) {
    case 'SET_LAYOUT':
      return action.mode;
    default:
      return state;
  }
}

export function useChatLayoutReducer(initial: ChatLayoutMode = 'FULL_TEXT') {
  const [layoutMode, dispatch] = useReducer(layoutReducer, initial);
  const setLayoutMode = useCallback((mode: ChatLayoutMode) => {
    dispatch({ type: 'SET_LAYOUT', mode });
  }, []);
  return { layoutMode, setLayoutMode };
}

import { useApp } from '../contexts/AppContext.tsx';

export function useSettings() {
  const { state } = useApp();
  return state.settings;
}

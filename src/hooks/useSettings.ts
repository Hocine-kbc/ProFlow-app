import { useApp } from '../contexts/AppContext';

export function useSettings() {
  const { state } = useApp();
  return state.settings;
}

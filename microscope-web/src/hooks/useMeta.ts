import { useState, useEffect } from 'react';
import { useYjsContext } from '../context/YjsContext';
import { type MetaMapSchema } from '../types/meta';

// Define the shape of the state object returned by the hook
type MetaState = Partial<MetaMapSchema>;

/**
 * A reactive hook that provides a strongly-typed, plain JavaScript object
 * representing the current state of the Y.js 'meta' map.
 *
 * @returns An object with the latest metadata values.
 */
export function useMeta(): MetaState {
  const { meta } = useYjsContext();
  const [metaState, setMetaState] = useState<MetaState>(() => meta.toJSON());

  useEffect(() => {
    const updateMetaState = () => {
      setMetaState(meta.toJSON());
    };

    // Set initial state
    updateMetaState();

    // Subscribe to changes
    meta.observe(updateMetaState);

    // Unsubscribe on cleanup
    return () => {
      meta.unobserve(updateMetaState);
    };
  }, [meta]);

  return metaState;
}

/**
 * useOfflineData Hook - Fetch data with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useOffline } from '../context/OfflineContext';

/**
 * Hook for fetching data with offline support
 * @param {string} storeName - IndexedDB store name
 * @param {string} endpoint - API endpoint
 * @param {object} options - Additional options
 */
export function useOfflineData(storeName, endpoint, options = {}) {
  const { fetchOffline, isOnline } = useOffline();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const { 
    autoFetch = true, 
    dependencies = [],
    transform = null 
  } = options;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchOffline(storeName, endpoint);
      
      if (result.success) {
        let fetchedData = result.data || [];
        
        // Apply transform if provided
        if (transform && typeof transform === 'function') {
          fetchedData = transform(fetchedData);
        }
        
        setData(fetchedData);
        setFromCache(result.fromCache);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('useOfflineData error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeName, endpoint, fetchOffline, transform]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch, ...dependencies]);

  const refetch = useCallback(() => {
    return fetch();
  }, [fetch]);

  return {
    data,
    loading,
    error,
    fromCache,
    isOnline,
    refetch
  };
}

/**
 * Hook for CRUD operations with offline support
 * @param {string} storeName - IndexedDB store name
 */
export function useOfflineCRUD(storeName) {
  const { createOffline, updateOffline, deleteOffline } = useOffline();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createOffline(storeName, data);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [storeName, createOffline]);

  const update = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateOffline(storeName, id, data);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [storeName, updateOffline]);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await deleteOffline(storeName, id);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [storeName, deleteOffline]);

  return {
    create,
    update,
    remove,
    loading,
    error
  };
}

export default useOfflineData;

import { useState, useRef, useCallback, useEffect } from 'react';

export function useSSEStream() {
  const [items, setItems] = useState([]);
  const [streamStatus, setStreamStatus] = useState('idle'); // idle | connecting | streaming | paused | stopped | completed | error
  const [perFileCounts, setPerFileCounts] = useState({});
  const [metrics, setMetrics] = useState({
    totalMatches: 0,
    matchesPerSec: 0,
    bandwidthBytes: 0,
    bytesPerSec: 0,
    durationMs: 0
  });
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const isPausedRef = useRef(false);
  const pauseBufferRef = useRef([]);
  const itemsRef = useRef([]);
  const perFileRef = useRef({});

  // Performance calculation refs
  const startTimeRef = useRef(0);
  const lastMetricsUpdateRef = useRef(0);
  const recentMatchesRef = useRef([]);
  const recentBytesRef = useRef([]);

  // Sync ref with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Periodic metrics updater (every 400ms)
  useEffect(() => {
    if (streamStatus !== 'streaming' && streamStatus !== 'paused') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const oneSecAgo = now - 1000;

      // Filter sliding windows for rate calculation
      recentMatchesRef.current = recentMatchesRef.current.filter(t => t > oneSecAgo);
      recentBytesRef.current = recentBytesRef.current.filter(b => b.timestamp > oneSecAgo);

      const matchesPerSec = recentMatchesRef.current.length;
      const bytesPerSec = recentBytesRef.current.reduce((acc, b) => acc + b.bytes, 0);
      const durationMs = startTimeRef.current ? (now - startTimeRef.current) : 0;

      setMetrics(prev => ({
        ...prev,
        matchesPerSec,
        bytesPerSec,
        durationMs
      }));
    }, 400);

    return () => clearInterval(interval);
  }, [streamStatus]);

  // Pause / Resume Stream
  const pauseStream = useCallback(() => {
    isPausedRef.current = true;
    setStreamStatus('paused');
  }, []);

  const resumeStream = useCallback(() => {
    isPausedRef.current = false;
    setStreamStatus('streaming');

    // Flush any buffered items
    if (pauseBufferRef.current.length > 0) {
      const buffered = [...pauseBufferRef.current];
      pauseBufferRef.current = [];
      setItems(prev => [...prev, ...buffered]);
    }
  }, []);

  // Stop Engine (both local abort and backend signal)
  const stopEngine = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      await fetch('/api/search/stop', { method: 'POST' });
    } catch (e) {}

    setStreamStatus('stopped');
  }, []);

  // Clear Stream
  const clearStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setItems([]);
    itemsRef.current = [];
    setPerFileCounts({});
    perFileRef.current = {};
    pauseBufferRef.current = [];
    setStreamStatus('idle');
    setError(null);
    setMetrics({
      totalMatches: 0,
      matchesPerSec: 0,
      bandwidthBytes: 0,
      bytesPerSec: 0,
      durationMs: 0
    });
  }, []);

  // Start Stream
  const startStream = useCallback(async (query = '', specificFiles = []) => {
    clearStream();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isPausedRef.current = false;
    setStreamStatus('connecting');

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (specificFiles && specificFiles.length > 0) {
      params.set('files', specificFiles.join(','));
    }

    startTimeRef.current = Date.now();
    lastMetricsUpdateRef.current = Date.now();
    recentMatchesRef.current = [];
    recentBytesRef.current = [];

    try {
      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/event-stream'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStreamStatus('streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let partialChunk = '';
      let batchItems = [];
      let lastBatchFlush = Date.now();

      const flushBatch = () => {
        if (batchItems.length === 0) return;
        const currentBatch = [...batchItems];
        batchItems = [];

        if (isPausedRef.current) {
          pauseBufferRef.current.push(...currentBatch);
        } else {
          setItems(prev => [...prev, ...currentBatch]);
        }
        setPerFileCounts({ ...perFileRef.current });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkSize = value?.length || 0;
        const now = Date.now();

        // Update bandwidth telemetry
        setMetrics(prev => ({
          ...prev,
          bandwidthBytes: prev.bandwidthBytes + chunkSize
        }));
        recentBytesRef.current.push({ bytes: chunkSize, timestamp: now });

        partialChunk += decoder.decode(value, { stream: true });
        const lines = partialChunk.split('\n');
        partialChunk = lines.pop() || ''; // keep trailing incomplete line

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const item = JSON.parse(dataStr);
              if (item && item.id) {
                batchItems.push(item);
                recentMatchesRef.current.push(now);

                // Update per-file counts
                const fn = item.file || 'unknown.txt';
                perFileRef.current[fn] = (perFileRef.current[fn] || 0) + 1;

                setMetrics(prev => ({
                  ...prev,
                  totalMatches: prev.totalMatches + 1
                }));
              }
            } catch (err) {
              // Ignore non-JSON ping/keepalive
            }
          } else if (line.startsWith('event: done')) {
            // End of stream event
            flushBatch();
            setStreamStatus('completed');
          } else if (line.startsWith('event: error')) {
            const errData = lines[i + 1]?.startsWith('data: ') ? lines[i + 1].slice(6) : '{}';
            try {
              const parsedErr = JSON.parse(errData);
              setError(parsedErr.message || 'Stream error occurred');
            } catch (e) {
              setError('Stream error occurred');
            }
            setStreamStatus('error');
          }
        }

        // Batch flush every 50ms or when 250 items accumulate (for ultra-smooth 60fps rendering)
        if (batchItems.length >= 250 || (now - lastBatchFlush > 50 && batchItems.length > 0)) {
          flushBatch();
          lastBatchFlush = now;
        }
      }

      // Final flush
      flushBatch();
      if (streamStatus !== 'error' && streamStatus !== 'stopped') {
        setStreamStatus('completed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // aborted intentionally
        setStreamStatus('stopped');
      } else {
        console.error('SSE Stream error:', err);
        setError(err.message || 'Network stream error');
        setStreamStatus('error');
      }
    }
  }, [clearStream, streamStatus]);

  return {
    items,
    streamStatus,
    isStreaming: streamStatus === 'streaming' || streamStatus === 'connecting',
    isPaused: streamStatus === 'paused',
    perFileCounts,
    metrics,
    error,
    startStream,
    pauseStream,
    resumeStream,
    stopEngine,
    clearStream
  };
}

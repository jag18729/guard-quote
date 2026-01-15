import { useEffect, useRef, useState, useCallback } from "react";
import type { MLQuoteResponse, RiskAssessmentResponse } from "../services/api";

interface QuoteData {
  eventType: string;
  locationZip: string;
  numGuards: number;
  hours: number;
  eventDate?: string;
  crowdSize?: number;
  isArmed?: boolean;
  requiresVehicle?: boolean;
}

interface WSQuoteResult extends MLQuoteResponse {
  risk_assessment?: RiskAssessmentResponse;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useQuoteWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [quote, setQuote] = useState<WSQuoteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? "3000" : window.location.port;
    const wsUrl = `${protocol}//${host}:${port}/ws/client`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus("connected");
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              console.log("[WS] Connected:", message.data.clientId);
              break;

            case "price.calculating":
              setIsCalculating(true);
              break;

            case "price.update":
              setIsCalculating(false);
              setQuote(message.data);
              setError(null);
              break;

            case "price.error":
              setIsCalculating(false);
              setError(message.data.message);
              break;

            case "pong":
              // Heartbeat response
              break;

            default:
              console.log("[WS] Unknown message type:", message.type);
          }
        } catch {
          console.error("[WS] Failed to parse message");
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;

        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setStatus("error");
        setError("WebSocket connection failed");
      };

      wsRef.current = ws;
    } catch (err) {
      setStatus("error");
      setError("Failed to create WebSocket connection");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  // Calculate quote with debouncing (300ms)
  const calculateQuote = useCallback((data: QuoteData) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        setError("WebSocket not connected");
        return;
      }

      setIsCalculating(true);

      wsRef.current.send(
        JSON.stringify({
          type: "price.calculate",
          data: {
            event_type: data.eventType,
            location_zip: data.locationZip,
            num_guards: data.numGuards,
            hours: data.hours,
            date: data.eventDate,
            crowd_size: data.crowdSize || 0,
            is_armed: data.isArmed || false,
            requires_vehicle: data.requiresVehicle || false,
          },
        })
      );
    }, 300);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    quote,
    isCalculating,
    error,
    calculateQuote,
    connect,
    disconnect,
    isConnected: status === "connected",
  };
}

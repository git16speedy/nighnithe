import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Enums } from '@/integrations/supabase/types';

type OrderStatus = Enums<'order_status'>;

interface OrderFlowSettings {
  is_pending_active: boolean;
  is_preparing_active: boolean;
}

const DEFAULT_SETTINGS: OrderFlowSettings = {
  is_pending_active: true,
  is_preparing_active: true,
};

export function useOrderFlow() {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<OrderFlowSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!profile?.store_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("order_flow_settings")
      .select("is_pending_active, is_preparing_active")
      .eq("store_id", profile.store_id)
      .maybeSingle();

    if (error) {
      console.error("Error loading order flow settings:", error);
      toast({
        variant: "destructive",
        title: "Erro de Configuração",
        description: "Não foi possível carregar as configurações de fluxo de pedidos. Usando padrão.",
      });
    }

    setSettings(data || DEFAULT_SETTINGS);
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => {
    if (!authLoading) {
      loadSettings();
    }
  }, [authLoading, loadSettings]);

  /**
   * Determina o status inicial de um novo pedido com base nas configurações.
   * @returns {OrderStatus} O status inicial ('pending', 'preparing', ou 'ready').
   */
  const getInitialStatus = useCallback((): OrderStatus => {
    if (settings.is_pending_active) {
      return 'pending';
    }
    if (settings.is_preparing_active) {
      return 'preparing';
    }
    return 'ready';
  }, [settings]);

  /**
   * Determina o próximo status no fluxo de pedidos.
   * @param {OrderStatus} currentStatus O status atual do pedido.
   * @returns {OrderStatus | null} O próximo status ou null se o fluxo terminar (ex: 'ready' -> 'delivered').
   */
  const getNextStatus = useCallback((currentStatus: OrderStatus): OrderStatus | null => {
    const flow: OrderStatus[] = [];
    
    if (settings.is_pending_active) {
      flow.push('pending');
    }
    if (settings.is_preparing_active) {
      flow.push('preparing');
    }
    flow.push('ready'); // 'ready' is always the final active stage before 'delivered'

    const currentIndex = flow.indexOf(currentStatus);
    
    if (currentIndex === -1 || currentIndex === flow.length - 1) {
      return null; // Current status is not in the active flow or is the last step ('ready')
    }

    return flow[currentIndex + 1];
  }, [settings]);

  return {
    settings,
    loading,
    getInitialStatus,
    getNextStatus,
    // Expor o fluxo ativo para que o OrderPanel saiba quais colunas exibir
    activeFlow: [
      settings.is_pending_active ? 'pending' : null,
      settings.is_preparing_active ? 'preparing' : null,
      'ready',
    ].filter((s): s is OrderStatus => s !== null),
  };
}
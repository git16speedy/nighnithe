import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings as SettingsIcon, 
  Store,
  Bell,
  Users,
  Shield,
  Palette,
  Database,
  Copy,
  Truck,
  Wrench,
  ListOrdered, // Novo ícone para fluxo de pedidos
  DollarSign, // Para o card de assinatura
  CalendarDays, // Para datas de assinatura
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase as sb } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSoundNotification } from "@/hooks/useSoundNotification"; // Importando o novo hook
import { Enums } from '@/integrations/supabase/types'; // Importando Enums para tipagem

const supabase: any = sb;

interface OrderFlowSettings {
  is_pending_active: boolean;
  is_preparing_active: boolean;
}

interface StoreSubscriptionData {
  subscription_plan: Enums<'subscription_type'>;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
}

interface SubscriptionHistoryEntry {
  id: string;
  subscription_plan: Enums<'subscription_type'>;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function Settings() {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isEnabled: isSoundEnabled, toggleSound } = useSoundNotification(); // Usando o hook

  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [motoboyWhatsappNumber, setMotoboyWhatsappNumber] = useState("");
  const [currentSubscription, setCurrentSubscription] = useState<StoreSubscriptionData | null>(null); // NOVO
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryEntry[]>([]); // NOVO

  // NOVO: Order Flow Settings
  const [orderFlowSettings, setOrderFlowSettings] = useState<OrderFlowSettings>({
    is_pending_active: true,
    is_preparing_active: true,
  });

  useEffect(() => {
    if (profile?.store_id) {
      loadStoreSettings();
      loadOrderFlowSettings(); // Carregar novas configurações
      loadSubscriptionDetails(); // NOVO: Carregar detalhes da assinatura
    }
  }, [profile]);

  const loadStoreSettings = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("stores")
      .select("name, display_name, phone, address, motoboy_whatsapp_number, is_active")
      .eq("id", profile.store_id)
      .single();

    if (error) {
      console.error("Erro ao carregar configurações da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
      return;
    }

    if (data) {
      setStoreName(data.display_name || data.name);
      setStorePhone(data.phone || "");
      setStoreAddress(data.address || "");
      setMotoboyWhatsappNumber(data.motoboy_whatsapp_number || "");
    }
  };

  const loadOrderFlowSettings = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("order_flow_settings")
      .select("is_pending_active, is_preparing_active")
      .eq("store_id", profile.store_id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações de fluxo:", error);
      // Mantém defaults se houver erro
      return;
    }

    if (data) {
      setOrderFlowSettings(data);
    }
  };

  // NOVO: Função para carregar detalhes da assinatura e histórico
  const loadSubscriptionDetails = async () => {
    if (!profile?.store_id) return;

    // Carregar plano atual da tabela 'stores'
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("subscription_plan, subscription_start_date, subscription_end_date")
      .eq("id", profile.store_id)
      .single();

    if (storeError) {
      console.error("Erro ao carregar plano atual da loja:", storeError.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o plano de assinatura atual.",
      });
    } else if (storeData) {
      setCurrentSubscription(storeData);
    }

    // Carregar histórico de assinaturas da tabela 'subscription_history'
    const { data: historyData, error: historyError } = await supabase
      .from("subscription_history")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("Erro ao carregar histórico de assinaturas:", historyError.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o histórico de assinaturas.",
      });
    } else if (historyData) {
      setSubscriptionHistory(historyData);
    }
  };

  const handleSaveStoreInfo = async () => {
    if (!profile?.store_id) return;

    const { error } = await supabase
      .from("stores")
      .update({
        name: storeName, // Usamos 'name' como fallback se 'display_name' for nulo, mas aqui salvamos em 'name'
        display_name: storeName,
        phone: storePhone || null,
        address: storeAddress || null,
      })
      .eq("id", profile.store_id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar informações da loja",
        description: error.message,
      });
    } else {
      toast({
        title: "Informações da loja salvas!",
        description: "O nome, telefone e endereço foram atualizados.",
      });
      loadStoreSettings();
    }
  };

  const handleSaveOrderFlowSettings = async () => {
    if (!profile?.store_id) return;

    const dataToSave = {
      store_id: profile.store_id,
      is_pending_active: orderFlowSettings.is_pending_active,
      is_preparing_active: orderFlowSettings.is_preparing_active,
    };

    const { error } = await supabase
      .from("order_flow_settings")
      .upsert(dataToSave, { onConflict: 'store_id' });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar fluxo de pedidos",
        description: error.message,
      });
    } else {
      toast({
        title: "Fluxo de pedidos salvo!",
        description: "As configurações de estágios foram atualizadas.",
      });
      loadOrderFlowSettings();
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (!profile?.store_id) return;

    const { error } = await supabase
      .from("stores")
      .update({ motoboy_whatsapp_number: motoboyWhatsappNumber || null })
      .eq("id", profile.store_id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar número do motoboy",
        description: error.message,
      });
    } else {
      toast({
        title: "Número do motoboy salvo!",
        description: "O número de WhatsApp do motoboy foi atualizado.",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "ID copiado!",
      description: "O ID foi copiado para a área de transferência",
    });
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Loja */}
        {!isAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informações da Loja
              </CardTitle>
              <CardDescription>
                Configure os dados básicos do estabelecimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nome da Loja</Label>
                <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-phone">Telefone</Label>
                <Input id="store-phone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-address">Endereço</Label>
                <Input id="store-address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
              </div>
              <Button onClick={handleSaveStoreInfo} className="w-full shadow-soft">Salvar Alterações</Button>
            </CardContent>
          </Card>
        )}

        {/* Minha Assinatura (NOVO CARD) */}
        {!isAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Minha Assinatura
              </CardTitle>
              <CardDescription>
                Visualize seu plano atual e histórico de assinaturas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSubscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Plano Atual:</p>
                    <Badge 
                      variant={currentSubscription.subscription_plan === 'free' ? 'secondary' : 'default'}
                      className={currentSubscription.subscription_plan === 'annual' ? 'bg-green-500 text-white' : ''}
                    >
                      {currentSubscription.subscription_plan.charAt(0).toUpperCase() + currentSubscription.subscription_plan.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Início: {currentSubscription.subscription_start_date ? format(parseISO(currentSubscription.subscription_start_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Expira: {currentSubscription.subscription_end_date ? format(parseISO(currentSubscription.subscription_end_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                  </div>
                  <Button className="w-full shadow-soft mt-4">
                    Contratar Novo Plano (Placeholder)
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Carregando detalhes da assinatura...</p>
              )}

              <Separator className="my-4" />

              <h3 className="text-lg font-semibold">Histórico de Assinaturas</h3>
              {subscriptionHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum histórico de assinatura encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subscriptionHistory.map((entry) => (
                    <div key={entry.id} className="p-3 bg-accent rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {entry.subscription_plan.charAt(0).toUpperCase() + entry.subscription_plan.slice(1)}
                        </p>
                        <Badge 
                          variant={entry.status === 'active' ? 'default' : 'secondary'}
                          className={entry.status === 'expired' ? 'bg-red-500 text-white' : ''}
                        >
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        De: {format(parseISO(entry.start_date), "dd/MM/yyyy", { locale: ptBR })}
                        {" "}Até: {format(parseISO(entry.end_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrado em: {format(parseISO(entry.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Configurações de Fluxo de Pedidos (NOVO CARD) */}
        {!isAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                Fluxo de Pedidos
              </CardTitle>
              <CardDescription>
                Defina quais estágios do painel de pedidos estão ativos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="space-y-0.5">
                  <Label>Ativar estágio "Aguardando"</Label>
                  <p className="text-sm text-muted-foreground">
                    Se desativado, novos pedidos vão direto para "Em Preparo" (ou "Pronto", se "Em Preparo" também estiver desativado).
                  </p>
                </div>
                <Switch 
                  checked={orderFlowSettings.is_pending_active}
                  onCheckedChange={(checked) => setOrderFlowSettings(prev => ({ ...prev, is_pending_active: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="space-y-0.5">
                  <Label>Ativar estágio "Em Preparo"</Label>
                  <p className="text-sm text-muted-foreground">
                    Se desativado, pedidos vão direto para "Pronto" após o estágio anterior.
                  </p>
                </div>
                <Switch 
                  checked={orderFlowSettings.is_preparing_active}
                  onCheckedChange={(checked) => setOrderFlowSettings(prev => ({ ...prev, is_preparing_active: checked }))}
                />
              </div>
              <Button onClick={handleSaveOrderFlowSettings} className="w-full shadow-soft">
                Salvar Fluxo de Pedidos
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Configurações de Entrega */}
        {!isAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Configurações de Entrega
              </CardTitle>
              <CardDescription>
                Gerencie as opções e contatos para entregas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motoboy-whatsapp">WhatsApp do Motoboy</Label>
                <Input 
                  id="motoboy-whatsapp" 
                  type="tel" 
                  placeholder="+55 68 8426-4931" 
                  value={motoboyWhatsappNumber}
                  onChange={(e) => setMotoboyWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-muted-foreground">
                  Número de WhatsApp para envio de detalhes de entrega. Apenas números.
                </p>
              </div>
              <Button onClick={handleSaveDeliverySettings} className="w-full shadow-soft">
                Salvar Configurações de Entrega
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Configurações de Notificação */}
        {!isAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure alertas e notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Som ao Receber Pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Reproduz um som quando um novo pedido é recebido
                  </p>
                </div>
                <Switch 
                  checked={isSoundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alerta de Estoque Baixo</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifica quando o estoque estiver acabando
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório Diário Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Gera relatório automaticamente ao final do dia
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Programa de Fidelidade */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Programa de Fidelidade
            </CardTitle>
            <CardDescription>
              Configure as regras do programa de pontuação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Programa Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita o programa de fidelidade
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button className="w-full shadow-soft">Salvar Configurações</Button>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de acesso e segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Alterar Senha de Administrador</Label>
              <Input id="admin-password" type="password" placeholder="Nova senha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input id="confirm-password" type="password" placeholder="Confirme a senha" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Login Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Mantém logado por 30 dias
                </p>
              </div>
              <Switch />
            </div>
            <Button className="w-full shadow-soft">Alterar Senha</Button>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a interface do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sons da Interface</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduz sons ao interagir com botões
                </p>
              </div>
              <Switch 
                checked={isSoundEnabled}
                onCheckedChange={toggleSound}
              />
            </div>
          </CardContent>
        </Card>

        {/* ID do Usuário */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Identificação
            </CardTitle>
            <CardDescription>
              Informações do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID do Usuário</Label>
              <div className="flex gap-2">
                <Input 
                  value={user?.id || ""} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => user?.id && copyToClipboard(user.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este ID para identificação em suporte técnico
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados e Backup */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dados e Backup
            </CardTitle>
            <CardDescription>
              Gerencie os dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Faz backup dos dados diariamente
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Fazer Backup Manual
              </Button>
              <Button variant="outline" className="w-full">
                Restaurar Backup
              </Button>
              <Button variant="destructive" className="w-full">
                Limpar Dados (Cuidado!)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instalação do Sistema (apenas para admins) */}
        {isAdmin && (
          <Card className="shadow-soft border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Instalação do Sistema
              </CardTitle>
              <CardDescription>
                Configure toda a infraestrutura do sistema (Acesso Admin)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Acesse o painel de instalação para configurar tabelas, políticas de segurança,
                edge functions e todas as funcionalidades necessárias para o funcionamento completo do sistema.
              </p>
              <Button 
                onClick={() => navigate("/setup")} 
                className="w-full"
                variant="default"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Acessar Painel de Instalação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
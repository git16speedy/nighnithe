import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Store, Link as LinkIcon, Settings as SettingsIcon, Bell, MessageSquare, Copy, Check } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StoreHoursSettings from "@/components/StoreHoursSettings"; // Importar o novo componente

const supabase: any = sb;

interface StoreData {
  id: string;
  name: string;
  slug: string | null;
  display_name: string | null;
  is_active: boolean;
  image_url?: string;
  ifood_stock_alert_enabled: boolean;
  ifood_stock_alert_threshold: number; // NOVO: Adicionado o threshold
  whatsapp_ai_enabled: boolean;
  whatsapp_ai_api_key?: string | null;
}

export default function MyStore() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [ifoodStockAlertEnabled, setIfoodStockAlertEnabled] = useState(false);
  const [ifoodStockAlertThreshold, setIfoodStockAlertThreshold] = useState("0"); // NOVO: Estado para o threshold
  const [whatsappAiEnabled, setWhatsappAiEnabled] = useState(false);
  const [whatsappAiApiKey, setWhatsappAiApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [showStoreSettingsDialog, setShowStoreSettingsDialog] = useState(false);
  const [copiedStoreUrl, setCopiedStoreUrl] = useState(false);
  const [copiedMonitorUrl, setCopiedMonitorUrl] = useState(false);
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadStoreData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const loadStoreData = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("stores")
      .select("*") // Selecionar todas as colunas
      .eq("id", profile.store_id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar dados da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados da loja",
        description: error.message,
      });
      setLoading(false);
      return;
    }

    if (data) {
      setStoreData(data);
      setDisplayName(data.display_name || data.name);
      setSlug(data.slug || "");
      setIsActive(data.is_active ?? true);
      setImageUrl(data.image_url || "");
      setIfoodStockAlertEnabled(data.ifood_stock_alert_enabled ?? false);
      setIfoodStockAlertThreshold((data.ifood_stock_alert_threshold ?? 0).toString()); // NOVO: Carregar threshold
      setWhatsappAiEnabled(data.whatsapp_ai_enabled ?? false);
      setWhatsappAiApiKey(data.whatsapp_ai_api_key || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!storeData) return;

    // Validar slug
    const slugRegex = /^[a-z0-9-]+$/;
    if (slug && !slugRegex.test(slug)) {
      toast({
        variant: "destructive",
        title: "URL inválida",
        description: "Use apenas letras minúsculas, números e hífens",
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: any = {
      display_name: displayName,
      slug: slug || null,
      is_active: isActive,
      image_url: imageUrl || null,
      ifood_stock_alert_enabled: ifoodStockAlertEnabled,
      ifood_stock_alert_threshold: parseInt(ifoodStockAlertThreshold),
    };

    // Adicionar campos de WhatsApp AI apenas se as colunas existirem
    if ('whatsapp_ai_enabled' in (storeData as any)) {
      updateData.whatsapp_ai_enabled = whatsappAiEnabled;
      updateData.whatsapp_ai_api_key = whatsappAiApiKey || null;
    }

    const { error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", storeData.id);

    if (error) {
      console.error("Erro ao salvar dados da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Configurações salvas!",
      description: "As alterações foram aplicadas com sucesso",
    });

    loadStoreData();
  };

  const getStoreUrl = () => {
    const baseUrl = window.location.origin;
    if (slug) {
      return `${baseUrl}/loja/${slug}`;
    }
    return `${baseUrl}/loja`;
  };

  const getMonitorUrl = () => {
    const baseUrl = window.location.origin;
    if (slug) {
      return `${baseUrl}/monitor/${slug}`;
    }
    return `${baseUrl}/monitor`;
  };

  const copyToClipboard = async (text: string, type: 'store' | 'monitor') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'store') {
        setCopiedStoreUrl(true);
        setTimeout(() => setCopiedStoreUrl(false), 2000);
      } else {
        setCopiedMonitorUrl(true);
        setTimeout(() => setCopiedMonitorUrl(false), 2000);
      }
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Esta página é para usuários de loja. Acesse "Lojas" para gerenciar as lojas do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Nenhuma loja encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minha Loja</h1>
          <p className="text-muted-foreground">Configure sua loja online</p>
        </div>
        <Dialog open={showStoreSettingsDialog} onOpenChange={setShowStoreSettingsDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="shadow-soft">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurações da Loja</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <StoreHoursSettings />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Informações da Loja
            </CardTitle>
            <CardDescription>
              Personalize o nome e a aparência da sua loja
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome da Loja</Label>
              <Input
                id="displayName"
                placeholder="Ex: Frango Assado do João"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Este nome será exibido para seus clientes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Logo (opcional)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://exemplo.com/logo.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Cole a URL da imagem da sua logo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Personalizada</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {window.location.origin}/loja/
                </span>
                <Input
                  id="slug"
                  placeholder="frangoassadodojoao"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Use apenas letras minúsculas, números e hífens
              </p>
            </div>

            {slug && (
              <div className="space-y-3" data-testid="store-urls-section">
                <div className="p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">URL da sua loja:</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={getStoreUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all flex-1"
                      data-testid="store-url-link"
                    >
                      {getStoreUrl()}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getStoreUrl(), 'store')}
                      className="shrink-0"
                      data-testid="copy-store-url-button"
                    >
                      {copiedStoreUrl ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">URL do monitor:</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={getMonitorUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all flex-1"
                      data-testid="monitor-url-link"
                    >
                      {getMonitorUrl()}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getMonitorUrl(), 'monitor')}
                      className="shrink-0"
                      data-testid="copy-monitor-url-button"
                    >
                      {copiedMonitorUrl ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Status da Loja</CardTitle>
            <CardDescription>
              Controle quando sua loja está disponível para pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div>
                <p className="font-medium">
                  {isActive ? "Loja Aberta" : "Loja Fechada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "Clientes podem fazer pedidos"
                    : "Clientes não podem fazer novos pedidos"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* NOVO CARD: Configurações de Integração PDV/iFood */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
            <CardDescription>
              Configure alertas para produtos que acabaram no PDV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg mb-4">
              <div>
                <p className="font-medium">Alerta de Pausa iFood</p>
                <p className="text-sm text-muted-foreground">
                  Exibe um alerta no PDV quando um produto zera o estoque, lembrando de pausar no iFood.
                </p>
              </div>
              <Switch
                checked={ifoodStockAlertEnabled}
                onCheckedChange={setIfoodStockAlertEnabled}
              />
            </div>
            {ifoodStockAlertEnabled && (
              <div className="space-y-2">
                <Label htmlFor="ifoodStockAlertThreshold">Ativar alerta quando o estoque for igual ou menor que:</Label>
                <Input
                  id="ifoodStockAlertThreshold"
                  type="number"
                  min="0"
                  value={ifoodStockAlertThreshold}
                  onChange={(e) => setIfoodStockAlertThreshold(e.target.value)}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">
                  Defina a quantidade de estoque para o alerta do iFood ser exibido no PDV.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* FIM NOVO CARD */}

        {/* NOVO CARD: WhatsApp Inteligente - Só exibe se as colunas existirem */}
        {'whatsapp_ai_enabled' in (storeData as any) && (
        <Card className="shadow-soft border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              WhatsApp Inteligente
            </CardTitle>
            <CardDescription>
              Conecte um agente de IA ao WhatsApp da sua loja para responder dúvidas sobre o cardápio e fazer reservas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="font-medium">Ativar WhatsApp IA</p>
                <p className="text-sm text-muted-foreground">
                  Habilite o assistente inteligente para atender seus clientes 24/7
                </p>
              </div>
              <Switch
                checked={whatsappAiEnabled}
                onCheckedChange={setWhatsappAiEnabled}
              />
            </div>

            {whatsappAiEnabled && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="whatsappAiApiKey">Chave de API</Label>
                  <Input
                    id="whatsappAiApiKey"
                    type="password"
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={whatsappAiApiKey}
                    onChange={(e) => setWhatsappAiApiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Cole aqui a chave de API fornecida para integrar o WhatsApp com a IA.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    ✨ O que o assistente pode fazer:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Responder perguntas sobre o cardápio</li>
                    <li>Informar preços e disponibilidade</li>
                    <li>Fazer reservas de mesas</li>
                    <li>Fornecer informações sobre horários de funcionamento</li>
                    <li>Receber pedidos e encaminhar para o PDV</li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Em desenvolvimento:</strong> Esta funcionalidade está sendo construída. 
                    Em breve você poderá conectar seu WhatsApp e começar a usar!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
        {/* FIM NOVO CARD */}

        <Button onClick={handleSave} className="w-full shadow-soft">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
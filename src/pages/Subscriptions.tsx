"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, CheckCircle, XCircle, Settings as SettingsIcon, Users, Edit, Calendar as CalendarIcon } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isAfter, isSameDay } from "date-fns"; // Adicionado isAfter, isSameDay
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Enums } from '@/integrations/supabase/types';

const supabase: any = sb;

interface SystemSettingsData {
  is_subscription_active: boolean;
  monthly_price: number;
  annual_price: number;
}

interface StoreWithUsers {
  id: string;
  name: string;
  display_name: string | null;
  subscription_plan: Enums<'subscription_type'>;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  }[];
}

// Componente para configurar os planos de assinatura (preços e ativação)
function SubscriptionPlansConfig() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SystemSettingsData>({
    is_subscription_active: false,
    monthly_price: 0.00,
    annual_price: 0.00,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadSubscriptionSettings();
    }
  }, [isAdmin]);

  const loadSubscriptionSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_settings")
      .select("is_subscription_active, monthly_price, annual_price")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações de assinatura:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
    } else if (data) {
      setSettings(data);
    } else {
      // If no settings exist, insert a default one
      const { data: newSettings, error: insertError } = await supabase
        .from("system_settings")
        .insert({ is_subscription_active: false, monthly_price: 0.00, annual_price: 0.00 })
        .select("is_subscription_active, monthly_price, annual_price")
        .single();
      
      if (insertError) {
        console.error("Erro ao inserir configurações padrão:", insertError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível inicializar as configurações de assinatura.",
        });
      } else {
        setSettings(newSettings);
      }
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permissão negada",
        description: "Você não tem permissão para salvar estas configurações.",
      });
      return;
    }

    const { error } = await supabase
      .from("system_settings")
      .update({
        is_subscription_active: settings.is_subscription_active,
        monthly_price: settings.monthly_price,
        annual_price: settings.annual_price,
      })
      .limit(1); // Ensure only the single row is updated

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
        description: error.message,
      });
    } else {
      toast({
        title: "Configurações de assinatura salvas!",
        description: "Os planos foram atualizados com sucesso.",
      });
      loadSubscriptionSettings(); // Reload to ensure state is fresh
    }
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configurações de Planos
          </CardTitle>
          <CardDescription>
            Carregando configurações de planos de assinatura...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <SettingsIcon className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Configurações de Planos
        </CardTitle>
        <CardDescription>
          Defina os preços e ative os planos pagos do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="isSubscriptionActive">Ativar sistema de assinatura</Label>
            <p className="text-sm text-muted-foreground">
              Habilita a cobrança e gestão de planos para lojistas.
            </p>
          </div>
          <Switch
            id="isSubscriptionActive"
            checked={settings.is_subscription_active}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_subscription_active: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyPrice">Preço do plano Mensal (R$)</Label>
          <Input
            id="monthlyPrice"
            type="number"
            step="0.01"
            min="0"
            value={settings.monthly_price.toFixed(2)}
            onChange={(e) => setSettings(prev => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualPrice">Preço do plano Anual (R$)</Label>
          <Input
            id="annualPrice"
            type="number"
            step="0.01"
            min="0"
            value={settings.annual_price.toFixed(2)}
            onChange={(e) => setSettings(prev => ({ ...prev, annual_price: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>

        <Button onClick={handleSaveSettings} className="w-full shadow-soft">
          Salvar Configurações
        </Button>

        <div className="pt-4 border-t space-y-2">
          <h3 className="text-lg font-semibold">Status Atual dos Planos:</h3>
          <div className="flex items-center gap-2">
            <span className="font-medium">Sistema de Assinatura:</span>
            {settings.is_subscription_active ? (
              <Badge className="bg-green-500 text-white flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Inativo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Plano Mensal: <span className="font-medium">R$ {settings.monthly_price.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Plano Anual: <span className="font-medium">R$ {settings.annual_price.toFixed(2)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Página principal de Assinaturas
export default function SubscriptionsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [storesWithUsers, setStoresWithUsers] = useState<StoreWithUsers[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  // Dialog states for changing plan
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedStoreToChangePlan, setSelectedStoreToChangePlan] = useState<StoreWithUsers | null>(null);
  const [newSubscriptionPlan, setNewSubscriptionPlan] = useState<Enums<'subscription_type'> | ''>('');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date | undefined>(undefined);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | undefined>(undefined);

  const loadStoresWithUsers = useCallback(async () => {
    setLoadingStores(true);
    const { data, error } = await supabase
      .from("stores")
      .select(`
        id,
        name,
        display_name,
        subscription_plan,
        subscription_start_date,
        subscription_end_date,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lojas e usuários:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar lojas",
        description: error.message,
      });
    } else {
      setStoresWithUsers(data || []);
    }
    setLoadingStores(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      loadStoresWithUsers();
    }
  }, [isAdmin, loadStoresWithUsers]);

  const openChangePlanDialog = (store: StoreWithUsers) => {
    setSelectedStoreToChangePlan(store);
    setNewSubscriptionPlan(store.subscription_plan || '');
    setSubscriptionStartDate(store.subscription_start_date ? parseISO(store.subscription_start_date) : undefined);
    setSubscriptionEndDate(store.subscription_end_date ? parseISO(store.subscription_end_date) : undefined);
    setShowChangePlanDialog(true);
  };

  const handleSavePlanChange = async () => {
    if (!selectedStoreToChangePlan || !newSubscriptionPlan) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um plano válido." });
      return;
    }

    // Validação para planos pagos
    if (newSubscriptionPlan !== 'free') {
      if (!subscriptionStartDate || !subscriptionEndDate) {
        toast({ variant: "destructive", title: "Datas obrigatórias", description: "Para planos pagos, as datas de início e expiração são obrigatórias." });
        return;
      }
      if (isSameDay(subscriptionStartDate, subscriptionEndDate) || isAfter(subscriptionStartDate, subscriptionEndDate)) {
        toast({ variant: "destructive", title: "Data de expiração inválida", description: "A data de expiração deve ser posterior à data de início." });
        return;
      }
    }

    const { error } = await supabase
      .from("stores")
      .update({ 
        subscription_plan: newSubscriptionPlan,
        subscription_start_date: newSubscriptionPlan !== 'free' && subscriptionStartDate ? format(subscriptionStartDate, "yyyy-MM-dd") : null,
        subscription_end_date: newSubscriptionPlan !== 'free' && subscriptionEndDate ? format(subscriptionEndDate, "yyyy-MM-dd") : null,
      })
      .eq("id", selectedStoreToChangePlan.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar plano", description: error.message });
    } else {
      toast({ title: "Plano atualizado!", description: `O plano da loja ${selectedStoreToChangePlan.display_name || selectedStoreToChangePlan.name} foi atualizado para ${newSubscriptionPlan}.` });
      setShowChangePlanDialog(false);
      loadStoresWithUsers(); // Reload data
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura do sistema e das lojas.</p>
        </div>
      </div>

      <SubscriptionPlansConfig /> {/* Componente de configuração de planos */}

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lojas e Planos Atuais
          </CardTitle>
          <CardDescription>
            Visualize e gerencie os planos de assinatura de cada loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStores ? (
            <div className="flex items-center justify-center py-8">
              <SettingsIcon className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground">Carregando lojas...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Administrador(es)</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storesWithUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma loja encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  storesWithUsers.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.display_name || store.name}</TableCell>
                      <TableCell>
                        {store.profiles && store.profiles.length > 0 ? (
                          store.profiles.map(profile => (
                            <div key={profile.id} className="text-sm text-muted-foreground">
                              {profile.full_name} ({profile.email})
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={store.subscription_plan === 'free' ? 'secondary' : 'default'}
                          className={store.subscription_plan === 'annual' ? 'bg-green-500 text-white' : ''}
                        >
                          {store.subscription_plan.charAt(0).toUpperCase() + store.subscription_plan.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {store.subscription_start_date ? format(parseISO(store.subscription_start_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {store.subscription_end_date ? format(parseISO(store.subscription_end_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openChangePlanDialog(store)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Alterar Plano
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Alterar Plano de Assinatura */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano de Assinatura</DialogTitle>
          </DialogHeader>
          {selectedStoreToChangePlan && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Loja: <span className="font-medium">{selectedStoreToChangePlan.display_name || selectedStoreToChangePlan.name}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="newPlan">Novo Plano</Label>
                <Select 
                  value={newSubscriptionPlan} 
                  onValueChange={(value: Enums<'subscription_type'>) => {
                    setNewSubscriptionPlan(value);
                    // Clear dates if switching to free plan
                    if (value === 'free') {
                      setSubscriptionStartDate(undefined);
                      setSubscriptionEndDate(undefined);
                    }
                  }}
                >
                  <SelectTrigger id="newPlan">
                    <SelectValue placeholder="Selecione o novo plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Grátis</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newSubscriptionPlan !== 'free' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !subscriptionStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {subscriptionStartDate ? format(subscriptionStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={subscriptionStartDate}
                          onSelect={setSubscriptionStartDate}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Expiração</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !subscriptionEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {subscriptionEndDate ? format(subscriptionEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={subscriptionEndDate}
                          onSelect={setSubscriptionEndDate}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlanChange}>
                  Salvar Plano
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
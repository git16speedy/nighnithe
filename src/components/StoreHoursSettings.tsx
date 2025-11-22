"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, CalendarDays, Plus, Trash2, Edit } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const supabase: any = sb;

interface StoreOperatingHour {
  id: string;
  store_id: string;
  day_of_week: number; // 0 for Sunday, 6 for Saturday
  is_open: boolean;
  open_time: string | null; // HH:mm
  close_time: string | null; // HH:mm
}

interface StoreSpecialDay {
  id: string;
  store_id: string;
  date: string; // YYYY-MM-DD
  is_open: boolean;
  open_time: string | null; // HH:mm
  close_time: string | null; // HH:mm
}

const daysOfWeek = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      times.push(`${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

// Helper function to normalize time format from HH:MM:SS to HH:MM
const normalizeTimeFormat = (time: string | null): string | null => {
  if (!time) return null;
  // If time is in HH:MM:SS format, convert to HH:MM
  if (time.length === 8 && time.split(':').length === 3) {
    return time.substring(0, 5);
  }
  return time;
};

// Helper function to validate that close time is after open time
const isCloseTimeValid = (openTime: string | null, closeTime: string | null): boolean => {
  if (!openTime || !closeTime) return true; // If either is null, skip validation
  
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  return closeMinutes > openMinutes;
};

export default function StoreHoursSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [operatingHours, setOperatingHours] = useState<StoreOperatingHour[]>([]);
  const [specialDays, setSpecialDays] = useState<StoreSpecialDay[]>([]);
  const [showSpecialDayDialog, setShowSpecialDayDialog] = useState(false);
  const [selectedSpecialDate, setSelectedSpecialDate] = useState<Date | undefined>(undefined);
  const [specialDayIsOpen, setSpecialDayIsOpen] = useState(false);
  const [specialDayOpenTime, setSpecialDayOpenTime] = useState<string | null>(null);
  const [specialDayCloseTime, setSpecialDayCloseTime] = useState<string | null>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<StoreSpecialDay | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      loadOperatingHours();
      loadSpecialDays();
    }
  }, [profile]);

  const loadOperatingHours = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("store_operating_hours")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("day_of_week");

    if (error) {
      console.error("Erro ao carregar horários de funcionamento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar horários",
        description: error.message,
      });
      return;
    }

    const fetchedHours: StoreOperatingHour[] = data || [];
    // Ensure all 7 days are present, initialize if missing
    const fullHours = daysOfWeek.map((_, index) => {
      const existing = fetchedHours.find(h => h.day_of_week === index);
      if (existing) {
        // Normalize time format and set defaults if needed
        const normalizedOpenTime = normalizeTimeFormat(existing.open_time);
        const normalizedCloseTime = normalizeTimeFormat(existing.close_time);
        
        return {
          ...existing,
          open_time: existing.is_open && !normalizedOpenTime ? "08:00" : normalizedOpenTime,
          close_time: existing.is_open && !normalizedCloseTime ? "18:00" : normalizedCloseTime,
        };
      }
      return {
        id: `new-${index}`, // Temporary ID for new entries
        store_id: profile.store_id,
        day_of_week: index,
        is_open: false,
        open_time: "08:00",
        close_time: "18:00",
      };
    });
    setOperatingHours(fullHours);
  };

  const loadSpecialDays = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("store_special_days")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("date");

    if (error) {
      console.error("Erro ao carregar dias especiais:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dias especiais",
        description: error.message,
      });
      return;
    }
    setSpecialDays(data || []);
  };

  const handleOperatingHourChange = (index: number, field: keyof StoreOperatingHour, value: any) => {
    setOperatingHours(prev => {
      const newHours = [...prev];
      const updatedHour = { ...newHours[index], [field]: value };

      if (field === "is_open") {
        if (value === false) {
          updatedHour.open_time = null;
          updatedHour.close_time = null;
        } else { // value is true
          // Set default times if they are currently null or empty
          if (!updatedHour.open_time) updatedHour.open_time = "08:00";
          if (!updatedHour.close_time) updatedHour.close_time = "18:00";
        }
      }
      
      newHours[index] = updatedHour;
      return newHours;
    });
  };

  const handleSaveOperatingHours = async () => {
    if (!profile?.store_id) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Seu perfil não está vinculado a uma loja. Por favor, entre em contato com o administrador.",
      });
      return;
    }

    // Validar horários antes de salvar
    for (const hour of operatingHours) {
      if (hour.is_open) {
        const openTime = hour.open_time || "08:00";
        const closeTime = hour.close_time || "18:00";
        
        if (!isCloseTimeValid(openTime, closeTime)) {
          toast({
            variant: "destructive",
            title: "Horário inválido",
            description: `${daysOfWeek[hour.day_of_week]}: O horário de fechamento (${closeTime}) deve ser posterior ao horário de abertura (${openTime}).`,
          });
          return;
        }
      }
    }

    const updates = operatingHours.map(hour => {
      // Prepara os dados para o upsert
      const dataToSave = {
        store_id: profile.store_id,
        day_of_week: hour.day_of_week,
        is_open: hour.is_open,
        // Garante que se is_open for true, sempre tenha horários válidos
        open_time: hour.is_open ? (hour.open_time || "08:00") : null,
        close_time: hour.is_open ? (hour.close_time || "18:00") : null,
      };

      // Se o ID for um UUID real, inclua-o para garantir a atualização
      if (hour.id && !hour.id.startsWith('new-')) {
        return { ...dataToSave, id: hour.id };
      }
      
      // Se for um ID temporário, não inclua o ID para forçar a inserção (o Supabase gerará o ID)
      return dataToSave;
    });

    // Usamos upsert com conflito em store_id e day_of_week
    const { error } = await supabase
      .from("store_operating_hours")
      .upsert(updates, { onConflict: 'store_id,day_of_week' });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar horários de funcionamento",
        description: error.message,
      });
    } else {
      toast({
        title: "Horários de funcionamento salvos!",
        description: "As alterações foram aplicadas com sucesso",
      });
      loadOperatingHours(); // Reload to get actual IDs for newly inserted rows
    }
  };

  const openAddSpecialDayDialog = () => {
    setEditingSpecialDay(null);
    setSelectedSpecialDate(undefined);
    setSpecialDayIsOpen(true); // Default to open
    setSpecialDayOpenTime("08:00");
    setSpecialDayCloseTime("18:00");
    setShowSpecialDayDialog(true);
  };

  const openEditSpecialDayDialog = (day: StoreSpecialDay) => {
    setEditingSpecialDay(day);
    setSelectedSpecialDate(parseISO(day.date));
    setSpecialDayIsOpen(day.is_open);
    setSpecialDayOpenTime(normalizeTimeFormat(day.open_time));
    setSpecialDayCloseTime(normalizeTimeFormat(day.close_time));
    setShowSpecialDayDialog(true);
  };

  const handleSaveSpecialDay = async () => {
    if (!profile?.store_id || !selectedSpecialDate) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione uma data válida." });
      return;
    }

    // Validar horários se o dia estiver aberto
    if (specialDayIsOpen) {
      const openTime = specialDayOpenTime || "08:00";
      const closeTime = specialDayCloseTime || "18:00";
      
      if (!isCloseTimeValid(openTime, closeTime)) {
        toast({
          variant: "destructive",
          title: "Horário inválido",
          description: `O horário de fechamento (${closeTime}) deve ser posterior ao horário de abertura (${openTime}).`,
        });
        return;
      }
    }

    const formattedDate = format(selectedSpecialDate, "yyyy-MM-dd");

    const specialDayData = {
      store_id: profile.store_id,
      date: formattedDate,
      is_open: specialDayIsOpen,
      open_time: specialDayIsOpen ? specialDayOpenTime : null,
      close_time: specialDayIsOpen ? specialDayCloseTime : null,
    };

    if (editingSpecialDay) {
      const { error } = await supabase
        .from("store_special_days")
        .update(specialDayData)
        .eq("id", editingSpecialDay.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar dia especial", description: error.message });
      } else {
        toast({ title: "Dia especial atualizado!" });
        setShowSpecialDayDialog(false);
        loadSpecialDays();
      }
    } else {
      const { error } = await supabase
        .from("store_special_days")
        .insert(specialDayData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar dia especial", description: error.message });
      } else {
        toast({ title: "Dia especial adicionado!" });
        setShowSpecialDayDialog(false);
        loadSpecialDays();
      }
    }
  };

  const handleDeleteSpecialDay = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este dia especial?")) return;

    const { error } = await supabase
      .from("store_special_days")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir dia especial", description: error.message });
    } else {
      toast({ title: "Dia especial excluído!" });
      loadSpecialDays();
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Defina os horários de abertura e fechamento da loja por dia da semana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {operatingHours.map((hour, index) => {
          const hasInvalidTime = hour.is_open && hour.open_time && hour.close_time && !isCloseTimeValid(hour.open_time, hour.close_time);
          
          return (
            <div key={hour.day_of_week} className={cn("flex items-center justify-between gap-4 p-3 rounded-lg", hasInvalidTime ? "bg-red-50 dark:bg-red-950" : "bg-accent")}>
              <Label htmlFor={`day-${hour.day_of_week}`} className="flex-1 font-medium">
                {daysOfWeek[hour.day_of_week]}
              </Label>
              <Switch
                id={`day-${hour.day_of_week}`}
                checked={hour.is_open}
                onCheckedChange={(checked) => handleOperatingHourChange(index, "is_open", checked)}
              />
              {hour.is_open && (
                <>
                  <Select
                    value={hour.open_time || ""}
                    onValueChange={(value) => handleOperatingHourChange(index, "open_time", value)}
                  >
                    <SelectTrigger className={cn("w-[100px]", hasInvalidTime && "border-red-500")}>
                      <SelectValue placeholder="Abre" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={hour.close_time || ""}
                    onValueChange={(value) => handleOperatingHourChange(index, "close_time", value)}
                  >
                    <SelectTrigger className={cn("w-[100px]", hasInvalidTime && "border-red-500")}>
                      <SelectValue placeholder="Fecha" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasInvalidTime && (
                    <span className="text-xs text-red-600 dark:text-red-400">⚠️</span>
                  )}
                </>
              )}
            </div>
          );
        })}
        <Button onClick={handleSaveOperatingHours} className="w-full shadow-soft">
          Salvar Horários Semanais
        </Button>

        <Separator className="my-6" />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Dias Especiais
          </h3>
          <Button size="sm" onClick={openAddSpecialDayDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Dia
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Defina horários específicos para feriados ou eventos.
        </p>

        <div className="space-y-3">
          {specialDays.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum dia especial configurado.</p>
          ) : (
            specialDays.map(day => (
              <div key={day.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div>
                  <p className="font-medium">{format(parseISO(day.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p className="text-sm text-muted-foreground">
                    {day.is_open ? `Aberto das ${normalizeTimeFormat(day.open_time)} às ${normalizeTimeFormat(day.close_time)}` : "Fechado"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditSpecialDayDialog(day)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteSpecialDay(day.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Dialog para Adicionar/Editar Dia Especial */}
      <Dialog open={showSpecialDayDialog} onOpenChange={(open) => {
        setShowSpecialDayDialog(open);
        if (!open) {
          setEditingSpecialDay(null);
          setSelectedSpecialDate(undefined);
          setSpecialDayIsOpen(false);
          setSpecialDayOpenTime(null);
          setSpecialDayCloseTime(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpecialDay ? "Editar Dia Especial" : "Adicionar Dia Especial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="specialDate">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedSpecialDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedSpecialDate ? format(selectedSpecialDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedSpecialDate}
                    onSelect={setSelectedSpecialDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="specialDayIsOpen"
                checked={specialDayIsOpen}
                onCheckedChange={setSpecialDayIsOpen}
              />
              <Label htmlFor="specialDayIsOpen">Loja Aberta neste dia?</Label>
            </div>
            {specialDayIsOpen && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialOpenTime">Abre às</Label>
                  <Select
                    value={specialDayOpenTime || ""}
                    onValueChange={setSpecialDayOpenTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Horário de Abertura" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialCloseTime">Fecha às</Label>
                  <Select
                    value={specialDayCloseTime || ""}
                    onValueChange={setSpecialDayCloseTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Horário de Fechamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSpecialDayDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSpecialDay}>
              {editingSpecialDay ? "Salvar Alterações" : "Adicionar Dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
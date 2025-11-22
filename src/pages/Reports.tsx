import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Download, 
  TrendingUp,
  Calendar as CalendarIcon, // Renomeado para evitar conflito
  DollarSign,
  Package,
  Clock,
  Users,
  ListOrdered,
  Hourglass,
} from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const supabase: any = sb;

interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalOrders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
}

interface PeakHour {
  hour: string;
  count: number;
}

export default function Reports() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loadingReports, setLoadingReports] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6), // Default to last 7 days
    to: new Date(),
  });

  // Daily Metrics
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [todayUniqueCustomers, setTodayUniqueCustomers] = useState(0);

  // Period Metrics
  const [salesByPeriod, setSalesByPeriod] = useState<DailySalesSummary[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);

  useEffect(() => {
    if (profile?.store_id) {
      loadReports();
    }
  }, [profile, dateRange]);

  const loadReports = async () => {
    if (!profile?.store_id) return;

    setLoadingReports(true);

    const todayStart = format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const todayEnd = format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const periodFrom = dateRange?.from ? format(startOfDay(dateRange.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : undefined;
    const periodTo = dateRange?.to ? format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : undefined;

    // --- Load Daily Metrics (Today) ---
    const { data: todayOrdersData, error: todayOrdersError } = await supabase
      .from("orders")
      .select("total, customer_id")
      .eq("store_id", profile.store_id)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .neq("status", "cancelled"); // Exclude cancelled orders

    if (todayOrdersError) {
      console.error("Erro ao carregar métricas diárias:", todayOrdersError.message);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as métricas diárias." });
    } else {
      const sales = todayOrdersData.reduce((sum: number, order: any) => sum + parseFloat(order.total.toString()), 0);
      const uniqueCustomers = new Set(todayOrdersData.map((order: any) => order.customer_id)).size;
      setTodaySales(sales);
      setTodayOrdersCount(todayOrdersData.length);
      setTodayUniqueCustomers(uniqueCustomers);
    }

    // --- Load Period Metrics ---
    if (periodFrom && periodTo) {
      // Sales by Period
      const { data: periodOrdersData, error: periodOrdersError } = await supabase
        .from("orders")
        .select("created_at, total")
        .eq("store_id", profile.store_id)
        .gte("created_at", periodFrom)
        .lte("created_at", periodTo)
        .neq("status", "cancelled") // Exclude cancelled orders
        .order("created_at", { ascending: true });

      if (periodOrdersError) {
        console.error("Erro ao carregar vendas por período:", periodOrdersError.message);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as vendas por período." });
      } else {
        const dailySummaryMap = new Map<string, { totalSales: number; totalOrders: number }>();
        periodOrdersData.forEach((order: any) => {
          const dateKey = format(parseISO(order.created_at), "yyyy-MM-dd");
          const current = dailySummaryMap.get(dateKey) || { totalSales: 0, totalOrders: 0 };
          current.totalSales += parseFloat(order.total.toString());
          current.totalOrders += 1;
          dailySummaryMap.set(dateKey, current);
        });

        const summaryArray = Array.from(dailySummaryMap.entries())
          .map(([date, data]) => ({ date, totalSales: data.totalSales, totalOrders: data.totalOrders }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSalesByPeriod(summaryArray);
      }

      // Top Selling Products
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          product_name,
          variation_name,
          quantity,
          orders!inner(created_at, store_id, status)
        `)
        .eq("orders.store_id", profile.store_id)
        .gte("orders.created_at", periodFrom)
        .lte("orders.created_at", periodTo)
        .neq("orders.status", "cancelled"); // Exclude cancelled orders

      if (orderItemsError) {
        console.error("Erro ao carregar produtos mais vendidos:", orderItemsError.message);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os produtos mais vendidos." });
      } else {
        const productSalesMap = new Map<string, number>();
        orderItemsData.forEach((item: any) => {
          const productName = item.variation_name ? `${item.product_name} (${item.variation_name})` : item.product_name;
          productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + item.quantity);
        });
        const sortedProducts = Array.from(productSalesMap.entries())
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10); // Top 10 products
        setTopProducts(sortedProducts);
      }

      // Peak Hours
      const { data: peakHoursData, error: peakHoursError } = await supabase
        .from("orders")
        .select("created_at")
        .eq("store_id", profile.store_id)
        .gte("created_at", periodFrom)
        .lte("created_at", periodTo)
        .neq("status", "cancelled"); // Exclude cancelled orders

      if (peakHoursError) {
        console.error("Erro ao carregar horários de pico:", peakHoursError.message);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os horários de pico." });
      } else {
        const hourCounts = new Map<string, number>();
        peakHoursData.forEach((order: any) => {
          const hour = format(parseISO(order.created_at), "HH");
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        });
        const sortedPeakHours = Array.from(hourCounts.entries())
          .map(([hour, count]) => ({ hour: `${hour}h`, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 peak hours
        setPeakHours(sortedPeakHours);
      }
    }

    setLoadingReports(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada de vendas e desempenho</p>
        </div>
        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Filtrar por data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button className="shadow-soft" disabled={loadingReports}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {loadingReports ? (
        <div className="flex items-center justify-center py-16">
          <Clock className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Carregando relatórios...</p>
        </div>
      ) : (
        <>
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-soft hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">R$ {todaySales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total de vendas do dia</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayOrdersCount}</div>
                <p className="text-xs text-muted-foreground">Pedidos realizados hoje</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayUniqueCustomers}</div>
                <p className="text-xs text-muted-foreground">Clientes que compraram hoje</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Hourglass className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Sem dados</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendas por Período */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Vendas por Período</CardTitle>
                <CardDescription>
                  Total de vendas e pedidos por dia no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {salesByPeriod.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de vendas disponível para o período.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesByPeriod.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell>{format(parseISO(day.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell className="text-right font-medium">R$ {day.totalSales.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{day.totalOrders}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Produtos Mais Vendidos */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>
                  Ranking dos produtos mais vendidos no período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {topProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum produto vendido no período.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right">{product.quantity} unidades</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Horários de Pico */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Horários de Pico</CardTitle>
                <CardDescription>
                  Períodos com maior volume de pedidos no período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {peakHours.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de horários de pico disponível para o período.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {peakHours.map((hour, index) => (
                          <TableRow key={index}>
                            <TableCell>{hour.hour}</TableCell>
                            <TableCell className="text-right">{hour.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Estoque (Placeholder) */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Movimentação de Estoque</CardTitle>
                <CardDescription>
                  Histórico de entrada e saída de produtos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de estoque disponível
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
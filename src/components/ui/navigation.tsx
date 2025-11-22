import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Star,
  FileText,
  Settings,
  Package,
  Store,
  Users,
  LogOut,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const mainLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pdv", label: "PDV", icon: ShoppingCart },
  { href: "/painel", label: "Painel de Pedidos", icon: ListOrdered },
  { href: "/fidelidade", label: "Fidelidade", icon: Star },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
];

const managementLinks: NavLink[] = [
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/minha-loja", label: "Minha Loja", icon: Store },
];

const adminLinks: NavLink[] = [
  { href: "/lojas", label: "Gerenciar Lojas", icon: Users, adminOnly: true },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, isAdmin, loading: authLoading } = useAuth();
  const [currentStoreName, setCurrentStoreName] = useState(""); // Inicializa com string vazia

  useEffect(() => {
    if (authLoading) {
      setCurrentStoreName("Carregando...");
      return;
    }
    
    if (profile?.store_name) {
      setCurrentStoreName(profile.store_name);
    } else if (isAdmin) {
      setCurrentStoreName("Admin Global");
    } else if (profile && !profile.store_id) {
      setCurrentStoreName("Sem Loja Vinculada");
    } else {
      setCurrentStoreName("");
    }
  }, [profile, isAdmin, authLoading]);

  const allLinks = [...mainLinks, ...managementLinks, ...adminLinks];

  const filteredLinks = allLinks.filter(link => !link.adminOnly || isAdmin);

  const renderLink = (link: NavLink) => {
    const isActive = location.pathname === link.href;
    const Icon = link.icon;

    return (
      <Link
        key={link.href}
        to={link.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        {link.label}
      </Link>
    );
  };

  return (
    <div className="fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r bg-sidebar shadow-lg">
      <div className="flex h-16 items-center border-b px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <Store className="h-6 w-6" />
          <span className="text-lg">Food Flow</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="grid items-start gap-2">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
              Principal
            </h2>
            <div className="grid gap-1">
              {mainLinks.map(renderLink)}
            </div>
          </div>

          <Separator className="my-2 bg-sidebar-border" />

          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
              Gestão
            </h2>
            <div className="grid gap-1">
              {managementLinks.map(renderLink)}
            </div>
          </div>

          {isAdmin && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
                  Administração
                </h2>
                <div className="grid gap-1">
                  {adminLinks.map(renderLink)}
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t bg-sidebar">
        <div className="mb-4">
          <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name || "Usuário"}</p>
          {/* Renderiza o nome da loja apenas se houver um valor definido */}
          {currentStoreName && (
            <p className="text-xs text-muted-foreground">
              {currentStoreName}
            </p>
          )}
        </div>
        <div className="grid gap-1">
          <Link
            to="/configuracoes"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              location.pathname === "/configuracoes" && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
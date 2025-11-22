import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Store, Link2, Check, X, Trash2, UserPlus, Search, Edit, Settings2, Copy, Truck, Monitor, Clock, Maximize2 } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge"; // Adicionado: Importação do componente Badge

const supabase: any = sb;

interface StoreData {
  id: string;
  name: string;
  display_name: string | null;
  slug: string | null;
  address: string | null;
  phone: string | null;
  cnpj: string | null;
  image_url: string | null;
  motoboy_whatsapp_number: string | null;
  is_active: boolean | null;
  monitor_slideshow_delay: number | null;
  monitor_idle_timeout_seconds: number | null;
  monitor_fullscreen_slideshow: boolean | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  store_id: string | null;
  approved: boolean;
  email: string | null;
}

export default function Stores() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [storeName, setStoreName] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Search states
  const [searchStoreTerm, setSearchStoreTerm] = useState("");
  const [searchUserTerm, setSearchUserTerm] = useState("");

  // Link user to store dialog states
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedStoreToLink, setSelectedStoreToLink] = useState<string>("");
  const [selectedUserToLink, setSelectedUserToLink] = useState<string>("");

  // Create new user dialog states
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserStore, setNewUserStore] = useState("");

  // Edit store dialog states
  const [showEditStoreDialog, setShowEditStoreDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [editStoreDisplayName, setEditStoreDisplayName] = useState("");
  const [editStoreSlug, setEditStoreSlug] = useState("");
  const [editStoreAddress, setEditStoreAddress] = useState("");
  const [editStorePhone, setEditStorePhone] = useState("");
  const [editStoreCnpj, setEditStoreCnpj] = useState("");
  const [editStoreImageUrl, setEditStoreImageUrl] = useState("");
  const [editStoreMotoboyWhatsappNumber, setEditStoreMotoboyWhatsappNumber] = useState("");
  const [editStoreIsActive, setEditStoreIsActive] = useState(true);
  const [editMonitorSlideshowDelay, setEditMonitorSlideshowDelay] = useState("5"); // in seconds
  const [editMonitorIdleTimeoutSeconds, setEditMonitorIdleTimeoutSeconds] = useState("30"); // in seconds
  const [editMonitorFullscreenSlideshow, setEditMonitorFullscreenSlideshow] = useState(false);

  // Edit user dialog states
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState(""); // Read-only
  const [editUserStoreId, setEditUserStoreId] = useState<string | null>(null);
  const [editUserApproved, setEditUserApproved] = useState(false);

  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      loadStores();
      loadUsers();
    }
  }, [isAdmin]);

  const loadStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar lojas",
        description: error.message,
      });
    } else {
      setStores(data || []);
    }
  };

  const loadUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, store_id, approved, email");

    if (profilesError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: profilesError.message,
      });
      return;
    }

    setUsers((profilesData || []) as UserProfile[]);
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("stores").insert({
      name: storeName,
      display_name: storeName,
      slug: storeName.toLowerCase().replace(/\s+/g, "-"),
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar loja",
        description: error.message,
      });
    } else {
      toast({
        title: "Loja adicionada com sucesso!",
      });
      setStoreName("");
      loadStores();
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta loja? Todos os dados associados (produtos, pedidos, clientes e usuários vinculados) serão perdidos permanentemente.")) {
      return;
    }

    console.log("Attempting to invoke admin-delete-store for storeId:", storeId);

    const { data, error } = await supabase.functions.invoke('admin-delete-store', {
      body: { storeId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir loja",
        description: error.message,
      });
    } else if (data && data.success) {
      toast({
        title: "Loja excluída com sucesso!",
      });
      loadStores();
      loadUsers();
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao excluir loja",
        description: data?.error || "Ocorreu um erro desconhecido.",
      });
    }
  };

  const handleLinkUserToStore = async () => {
    if (!selectedUserToLink || !selectedStoreToLink) {
      toast({
        variant: "destructive",
        title: "Selecione um usuário e uma loja",
      });
      return;
    }

    const { data: userData } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", selectedUserToLink)
      .single();

    if (userData?.store_id) {
      toast({
        variant: "destructive",
        title: "Usuário já vinculado a uma loja",
        description: "Um usuário não pode ser reatribuído a outra loja após o vínculo inicial.",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ store_id: selectedStoreToLink })
      .eq("id", selectedUserToLink);

    if (error) {
      const isReassignmentError = error.message.includes("não pode ser reatribuído") || 
                                   error.message.includes("já está vinculado");
      toast({
        variant: "destructive",
        title: "Erro ao vincular usuário",
        description: isReassignmentError 
          ? "Este usuário já está vinculado a uma loja e não pode ser reatribuído."
          : error.message,
      });
    } else {
      toast({
        title: "Usuário vinculado com sucesso!",
      });
      setIsLinkDialogOpen(false);
      setSelectedUserToLink("");
      setSelectedStoreToLink("");
      loadUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newUserEmail,
        password: newUserPassword,
        fullName: newUserName,
        storeId: newUserStore && newUserStore !== "none" ? newUserStore : undefined,
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Usuário criado e aprovado!",
    });
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserStore("");
    setShowCreateUserDialog(false);
    loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação é irreversível.")) return;

    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir usuário",
        description: error.message,
      });
    } else {
      toast({
        title: "Usuário excluído",
      });
      loadUsers();
    }
  };

  // --- Store Edit Functions ---
  const openEditStoreDialog = (store: StoreData) => {
    setEditingStore(store);
    setEditStoreDisplayName(store.display_name || store.name);
    setEditStoreSlug(store.slug || "");
    setEditStoreAddress(store.address || "");
    setEditStorePhone(store.phone || "");
    setEditStoreCnpj(store.cnpj || "");
    setEditStoreImageUrl(store.image_url || "");
    setEditStoreMotoboyWhatsappNumber(store.motoboy_whatsapp_number || "");
    setEditStoreIsActive(store.is_active ?? true);
    setEditMonitorSlideshowDelay(((store.monitor_slideshow_delay || 5000) / 1000).toString());
    setEditMonitorIdleTimeoutSeconds((store.monitor_idle_timeout_seconds || 30).toString());
    setEditMonitorFullscreenSlideshow(store.monitor_fullscreen_slideshow ?? false);
    setShowEditStoreDialog(true);
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    const slugRegex = /^[a-z0-9-]+$/;
    if (editStoreSlug && !slugRegex.test(editStoreSlug)) {
      toast({
        variant: "destructive",
        title: "URL inválida",
        description: "O slug deve conter apenas letras minúsculas, números e hífens.",
      });
      return;
    }

    const { error } = await supabase
      .from("stores")
      .update({
        display_name: editStoreDisplayName,
        slug: editStoreSlug || null,
        address: editStoreAddress || null,
        phone: editStorePhone || null,
        cnpj: editStoreCnpj || null,
        image_url: editStoreImageUrl || null,
        motoboy_whatsapp_number: editStoreMotoboyWhatsappNumber || null,
        is_active: editStoreIsActive,
        monitor_slideshow_delay: parseInt(editMonitorSlideshowDelay) * 1000,
        monitor_idle_timeout_seconds: parseInt(editMonitorIdleTimeoutSeconds),
        monitor_fullscreen_slideshow: editMonitorFullscreenSlideshow,
      })
      .eq("id", editingStore.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar loja",
        description: error.message,
      });
    } else {
      toast({
        title: "Loja atualizada com sucesso!",
      });
      setShowEditStoreDialog(false);
      loadStores();
    }
  };

  // --- User Edit Functions ---
  const openEditUserDialog = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserName(user.full_name || "");
    setEditUserEmail(user.email || "");
    setEditUserStoreId(user.store_id);
    setEditUserApproved(user.approved);
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editUserName,
        store_id: editUserStoreId,
        approved: editUserApproved,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    } else {
      toast({
        title: "Usuário atualizado com sucesso!",
      });
      setShowEditUserDialog(false);
      loadUsers();
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchStoreTerm.toLowerCase()) ||
    store.display_name?.toLowerCase().includes(searchStoreTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchUserTerm.toLowerCase())
  );

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Lojas e Usuários</h1>
        <p className="text-muted-foreground">Cadastre e gerencie lojas e usuários do sistema</p>
      </div>

      {/* Seção de Lojas */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Lojas Cadastradas
            </CardTitle>
            <CardDescription>Gerencie as lojas do sistema</CardDescription>
          </div>
          <form onSubmit={handleAddStore} className="flex gap-2">
            <Input
              placeholder="Nome da nova loja"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              className="w-48"
            />
            <Button type="submit" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Loja
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar loja por nome..."
                value={searchStoreTerm}
                onChange={(e) => setSearchStoreTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma loja encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.display_name || store.name}</TableCell>
                    <TableCell>{store.slug || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={store.is_active ? "default" : "secondary"}>
                        {store.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditStoreDialog(store)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Dialog open={isLinkDialogOpen && selectedStoreToLink === store.id} onOpenChange={(open) => {
                          setIsLinkDialogOpen(open);
                          if (open) setSelectedStoreToLink(store.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Vincular Usuário à Loja: {store.display_name || store.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Usuário</Label>
                                <Select value={selectedUserToLink} onValueChange={setSelectedUserToLink}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.filter(u => u.approved && !u.store_id).map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.full_name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {users.filter(u => u.approved && !u.store_id).length === 0 && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Todos os usuários aprovados já estão vinculados a lojas
                                  </p>
                                )}
                              </div>
                              <Button onClick={handleLinkUserToStore} className="w-full">
                                Vincular
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteStore(store.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seção de Usuários */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>Gerencie os usuários do sistema</CardDescription>
          </div>
          <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newUserName">Nome Completo</Label>
                  <Input
                    id="newUserName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nome do usuário"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserEmail">Email</Label>
                  <Input
                    id="newUserEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserPassword">Senha</Label>
                  <Input
                    id="newUserPassword"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Senha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserStore">Loja (opcional)</Label>
                  <Select value={newUserStore} onValueChange={setNewUserStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma loja</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateUserDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome ou email..."
                value={searchUserTerm}
                onChange={(e) => setSearchUserTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "Sem nome"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{stores.find(s => s.id === user.store_id)?.name || "Não vinculado"}</TableCell>
                    <TableCell>
                      <Badge variant={user.approved ? "default" : "secondary"}>
                        {user.approved ? "Aprovado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditUserDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Editar Loja */}
      <Dialog open={showEditStoreDialog} onOpenChange={setShowEditStoreDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Loja: {editingStore?.display_name || editingStore?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStore} className="space-y-4 py-4">
            <Card className="shadow-none border-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editStoreDisplayName">Nome de Exibição</Label>
                  <Input
                    id="editStoreDisplayName"
                    value={editStoreDisplayName}
                    onChange={(e) => setEditStoreDisplayName(e.target.value)}
                    placeholder="Nome que aparecerá para os clientes"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStoreSlug">Slug (URL Personalizada)</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {window.location.origin}/loja/
                    </span>
                    <Input
                      id="editStoreSlug"
                      value={editStoreSlug}
                      onChange={(e) => setEditStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="nome-da-loja"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras minúsculas, números e hífens.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStoreAddress">Endereço</Label>
                  <Input
                    id="editStoreAddress"
                    value={editStoreAddress}
                    onChange={(e) => setEditStoreAddress(e.target.value)}
                    placeholder="Rua Exemplo, 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStorePhone">Telefone</Label>
                  <Input
                    id="editStorePhone"
                    type="tel"
                    value={editStorePhone}
                    onChange={(e) => setEditStorePhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStoreCnpj">CNPJ</Label>
                  <Input
                    id="editStoreCnpj"
                    value={editStoreCnpj}
                    onChange={(e) => setEditStoreCnpj(e.target.value.replace(/\D/g, ''))}
                    placeholder="XX.XXX.XXX/XXXX-XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStoreImageUrl">URL da Logo</Label>
                  <Input
                    id="editStoreImageUrl"
                    type="url"
                    value={editStoreImageUrl}
                    onChange={(e) => setEditStoreImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="editStoreIsActive">Loja Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Controla se a loja está aberta para novos pedidos.
                    </p>
                  </div>
                  <Switch
                    id="editStoreIsActive"
                    checked={editStoreIsActive}
                    onCheckedChange={setEditStoreIsActive}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Configurações de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editStoreMotoboyWhatsappNumber">WhatsApp do Motoboy</Label>
                  <Input
                    id="editStoreMotoboyWhatsappNumber"
                    type="tel"
                    value={editStoreMotoboyWhatsappNumber}
                    onChange={(e) => setEditStoreMotoboyWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="+55 68 8426-4931"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de WhatsApp para envio de detalhes de entrega. Apenas números.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Configurações do Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editMonitorSlideshowDelay">Tempo de Duração do Slide (segundos)</Label>
                  <Input
                    id="editMonitorSlideshowDelay"
                    type="number"
                    min="1"
                    value={editMonitorSlideshowDelay}
                    onChange={(e) => setEditMonitorSlideshowDelay(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo que cada banner ficará visível antes de mudar para o próximo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMonitorIdleTimeoutSeconds">Tempo de Inatividade para Slideshow (segundos)</Label>
                  <Input
                    id="editMonitorIdleTimeoutSeconds"
                    type="number"
                    min="0"
                    value={editMonitorIdleTimeoutSeconds}
                    onChange={(e) => setEditMonitorIdleTimeoutSeconds(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo sem novos pedidos para o monitor começar a exibir o slideshow. Defina como 0 para sempre exibir pedidos.
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="editMonitorFullscreenSlideshow">Slideshow em Tela Cheia</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando o slideshow estiver ativo, ele ocupará a tela inteira.
                    </p>
                  </div>
                  <Switch
                    id="editMonitorFullscreenSlideshow"
                    checked={editMonitorFullscreenSlideshow}
                    onCheckedChange={setEditMonitorFullscreenSlideshow}
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditStoreDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Usuário */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário: {editingUser?.full_name || editingUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editUserName">Nome Completo</Label>
              <Input
                id="editUserName"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUserEmail">Email</Label>
              <Input
                id="editUserEmail"
                type="email"
                value={editUserEmail}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado por aqui.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUserStoreId">Loja Vinculada</Label>
              <Select value={editUserStoreId || "none"} onValueChange={setEditUserStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma loja</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="editUserApproved">Usuário Aprovado</Label>
                <p className="text-sm text-muted-foreground">
                  Controla se o usuário tem acesso ao sistema.
                </p>
              </div>
              <Switch
                id="editUserApproved"
                checked={editUserApproved}
                onCheckedChange={setEditUserApproved}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditUserDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
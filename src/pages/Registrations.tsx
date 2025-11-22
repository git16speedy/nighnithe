"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Phone, Building2, Package, MessageCircle, User, Factory, MapPin, Home, Briefcase, CalendarDays, DollarSign, Loader2 } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

const supabase: any = sb;

// Interfaces for Customers (adapted from Loyalty.tsx)
interface Customer {
  id: string;
  phone: string;
  name: string;
  points: number;
  created_at: string;
}

interface CustomerAddress {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  number: string;
  neighborhood: string;
  reference: string;
  cep: string;
}

// Interfaces for Suppliers
interface Supplier {
  id: string;
  store_id: string;
  corporate_name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  cost_price: number | null;
  products?: Product; // For joining product details
}

export default function Registrations() {
  const { profile } = useAuth();
  const { toast } = useToast();

  // --- Customer States ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showAddEditCustomerDialog, setShowAddEditCustomerDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [customerAddressesInModal, setCustomerAddressesInModal] = useState<CustomerAddress[]>([]);
  const [showAddEditAddressDialog, setShowAddEditAddressDialog] = useState(false);
  const [currentAddressForEdit, setCurrentAddressForEdit] = useState<CustomerAddress | null>(null);
  const [addressName, setAddressName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [addressCep, setAddressCep] = useState("");
  const [addressSkipCep, setAddressSkipCep] = useState(false);

  // --- Supplier States ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showAddEditSupplierDialog, setShowAddEditSupplierDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editSupplierCorporateName, setEditSupplierCorporateName] = useState("");
  const [editSupplierCnpj, setEditSupplierCnpj] = useState("");
  const [editSupplierAddress, setEditSupplierAddress] = useState("");
  const [editSupplierPhone, setEditSupplierPhone] = useState("");
  const [editSupplierWhatsapp, setEditSupplierWhatsapp] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [newSupplierProductId, setNewSupplierProductId] = useState("");
  const [newSupplierProductCostPrice, setNewSupplierProductCostPrice] = useState("");

  const [activeTab, setActiveTab] = useState("customers");

  // --- Loaders ---
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // --- Customer Effects ---
  useEffect(() => {
    if (profile?.store_id && activeTab === "customers") {
      loadCustomers();
    }
  }, [profile, activeTab]);

  // --- Supplier Effects ---
  useEffect(() => {
    if (profile?.store_id && activeTab === "suppliers") {
      loadSuppliers();
      loadAllProducts();
    }
  }, [profile, activeTab]);

  // --- Customer Functions ---
  const loadCustomers = async () => {
    if (!profile?.store_id) return;
    setLoadingCustomers(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, points, created_at")
      .eq("store_id", profile.store_id)
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar clientes", description: error.message });
    } else {
      setCustomers(data || []);
    }
    setLoadingCustomers(false);
  };

  const loadAddressesForCustomer = async (customerId: string) => {
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar endereços do cliente", description: error.message });
      return [];
    }
    setCustomerAddressesInModal(data || []);
    return data || [];
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  const openAddCustomerDialog = () => {
    setEditingCustomer(null);
    setEditCustomerName("");
    setEditCustomerPhone("");
    setCustomerAddressesInModal([]);
    setShowAddEditCustomerDialog(true);
  };

  const openEditCustomerDialog = async (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomerName(customer.name);
    setEditCustomerPhone(customer.phone);
    await loadAddressesForCustomer(customer.id);
    setShowAddEditCustomerDialog(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.store_id) return;

    if (!editCustomerName || !editCustomerPhone) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome e Telefone são obrigatórios." });
      return;
    }

    const customerData = {
      name: editCustomerName,
      phone: editCustomerPhone,
      store_id: profile.store_id,
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingCustomer.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar cliente", description: error.message });
      } else {
        toast({ title: "Cliente atualizado!" });
        setShowAddEditCustomerDialog(false);
        loadCustomers();
      }
    } else {
      const { error } = await supabase
        .from("customers")
        .insert(customerData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar cliente", description: error.message });
      } else {
        toast({ title: "Cliente adicionado!" });
        setShowAddEditCustomerDialog(false);
        loadCustomers();
      }
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Todos os pedidos e endereços associados serão removidos.")) return;

    // Delete associated data first due to foreign key constraints
    await supabase.from("order_items").delete().in("order_id", supabase.from("orders").select("id").eq("customer_id", customerId));
    await supabase.from("loyalty_transactions").delete().eq("customer_id", customerId);
    await supabase.from("customer_addresses").delete().eq("customer_id", customerId);
    await supabase.from("orders").delete().eq("customer_id", customerId);

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir cliente", description: error.message });
    } else {
      toast({ title: "Cliente excluído com sucesso!" });
      loadCustomers();
    }
  };

  const openAddAddressForCustomer = () => {
    setCurrentAddressForEdit(null);
    setAddressName("");
    setAddressStreet("");
    setAddressNumber("");
    setAddressNeighborhood("");
    setAddressReference("");
    setAddressCep("");
    setAddressSkipCep(false);
    setShowAddEditAddressDialog(true);
  };

  const openEditAddressForCustomer = (address: CustomerAddress) => {
    setCurrentAddressForEdit(address);
    setAddressName(address.name);
    setAddressStreet(address.address);
    setAddressNumber(address.number || "");
    setAddressNeighborhood(address.neighborhood);
    setAddressReference(address.reference || "");
    setAddressCep(address.cep || "");
    setAddressSkipCep(!address.cep);
    setShowAddEditAddressDialog(true);
  };

  const handleSaveAddressInModal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCustomer?.id || !addressName || !addressStreet || !addressNeighborhood) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome, Rua e Bairro são obrigatórios." });
      return;
    }

    const addressData = {
      customer_id: editingCustomer.id,
      name: addressName,
      address: addressStreet,
      number: addressNumber || null,
      neighborhood: addressNeighborhood,
      reference: addressReference || null,
      cep: addressSkipCep ? null : addressCep || null,
    };

    if (currentAddressForEdit) {
      const { error } = await supabase
        .from("customer_addresses")
        .update(addressData)
        .eq("id", currentAddressForEdit.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar endereço", description: error.message });
      } else {
        toast({ title: "Endereço atualizado!" });
        setShowAddEditAddressDialog(false);
        loadAddressesForCustomer(editingCustomer.id);
      }
    } else {
      const { error } = await supabase
        .from("customer_addresses")
        .insert(addressData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar endereço", description: error.message });
      } else {
        toast({ title: "Endereço adicionado!" });
        setShowAddEditAddressDialog(false);
        loadAddressesForCustomer(editingCustomer.id);
      }
    }
  };

  const handleDeleteAddressInModal = async (addressId: string) => {
    if (!confirm("Tem certeza que deseja excluir este endereço?")) return;

    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir endereço", description: error.message });
    } else {
      toast({ title: "Endereço excluído!" });
      if (editingCustomer) {
        loadAddressesForCustomer(editingCustomer.id);
      }
    }
  };

  // --- Supplier Functions ---
  const loadSuppliers = async () => {
    if (!profile?.store_id) return;
    setLoadingSuppliers(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("corporate_name");

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar fornecedores", description: error.message });
    } else {
      setSuppliers(data || []);
    }
    setLoadingSuppliers(false);
  };

  const loadAllProducts = async () => {
    if (!profile?.store_id) return;
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("store_id", profile.store_id)
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar produtos", description: error.message });
    } else {
      setAllProducts(data || []);
    }
  };

  const loadSupplierProducts = async (supplierId: string) => {
    // FIX: Usando o nome explícito da foreign key para resolver a ambiguidade de relacionamento
    // A FK é 'supplier_products_product_id_fkey' (do supplier_products para products)
    const { data, error } = await supabase
      .from("supplier_products")
      .select(`
        *,
        products!supplier_products_product_id_fkey (id, name, price)
      `)
      .eq("supplier_id", supplierId);
      // Removed .order("products.name") to fix the parsing error

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar produtos do fornecedor", description: error.message });
      return [];
    }
    
    // Sort on the client-side by product name
    const sortedData = (data || []).sort((a, b) => {
      const nameA = a.products?.name || '';
      const nameB = b.products?.name || '';
      return nameA.localeCompare(nameB);
    });

    setSupplierProducts(sortedData);
    return sortedData;
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.corporate_name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.cnpj?.includes(supplierSearchTerm) ||
    supplier.phone?.includes(supplierSearchTerm)
  );

  const openAddSupplierDialog = () => {
    setEditingSupplier(null);
    setEditSupplierCorporateName("");
    setEditSupplierCnpj("");
    setEditSupplierAddress("");
    setEditSupplierPhone("");
    setEditSupplierWhatsapp("");
    setSupplierProducts([]);
    setShowAddEditSupplierDialog(true);
  };

  const openEditSupplierDialog = async (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditSupplierCorporateName(supplier.corporate_name);
    setEditSupplierCnpj(supplier.cnpj || "");
    setEditSupplierAddress(supplier.address || "");
    setEditSupplierPhone(supplier.phone || "");
    setEditSupplierWhatsapp(supplier.whatsapp || "");
    await loadSupplierProducts(supplier.id);
    setShowAddEditSupplierDialog(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.store_id) return;

    if (!editSupplierCorporateName) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome da Pessoa Jurídica é obrigatório." });
      return;
    }

    const supplierData = {
      corporate_name: editSupplierCorporateName,
      cnpj: editSupplierCnpj || null,
      address: editSupplierAddress || null,
      phone: editSupplierPhone || null,
      whatsapp: editSupplierWhatsapp || null,
      store_id: profile.store_id,
    };

    if (editingSupplier) {
      const { error } = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("id", editingSupplier.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar fornecedor", description: error.message });
      } else {
        toast({ title: "Fornecedor atualizado!" });
        setShowAddEditSupplierDialog(false);
        loadSuppliers();
      }
    } else {
      const { error } = await supabase
        .from("suppliers")
        .insert(supplierData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar fornecedor", description: error.message });
      } else {
        toast({ title: "Fornecedor adicionado!" });
        setShowAddEditSupplierDialog(false);
        loadSuppliers();
      }
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor? Todos os produtos vinculados a ele também serão removidos.")) return;

    // Deleting supplier_products is handled by CASCADE DELETE on suppliers table
    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplierId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir fornecedor", description: error.message });
    } else {
      toast({ title: "Fornecedor excluído com sucesso!" });
      loadSuppliers();
    }
  };

  const handleAddSupplierProduct = async () => {
    if (!editingSupplier?.id || !newSupplierProductId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um produto." });
      return;
    }

    const productExists = supplierProducts.some(sp => sp.product_id === newSupplierProductId);
    if (productExists) {
      toast({ variant: "destructive", title: "Produto já adicionado", description: "Este produto já está vinculado a este fornecedor." });
      return;
    }

    const { error } = await supabase
      .from("supplier_products")
      .insert({
        supplier_id: editingSupplier.id,
        product_id: newSupplierProductId,
        cost_price: newSupplierProductCostPrice ? parseFloat(newSupplierProductCostPrice) : null,
      });

    if (error) {
      toast({ variant: "destructive", title: "Erro ao adicionar produto", description: error.message });
    } else {
      toast({ title: "Produto adicionado ao fornecedor!" });
      setNewSupplierProductId("");
      setNewSupplierProductCostPrice("");
      loadSupplierProducts(editingSupplier.id);
    }
  };

  const handleDeleteSupplierProduct = async (supplierProductId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este produto do fornecedor?")) return;

    const { error } = await supabase
      .from("supplier_products")
      .delete()
      .eq("id", supplierProductId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao desvincular produto", description: error.message });
    } else {
      toast({ title: "Produto desvinculado!" });
      if (editingSupplier) {
        loadSupplierProducts(editingSupplier.id);
      }
    }
  };

  if (!profile?.store_id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Você precisa estar vinculado a uma loja para gerenciar cadastros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie clientes e fornecedores da sua loja</p>
      </div>

      <Tabs defaultValue="customers" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
        </TabsList>

        {/* --- Clientes Tab --- */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Clientes Cadastrados
                </CardTitle>
                <CardDescription>Gerencie os clientes da sua loja</CardDescription>
              </div>
              <Button onClick={openAddCustomerDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nome ou telefone..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Carregando clientes...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => openEditCustomerDialog(customer)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="icon" onClick={() => handleDeleteCustomer(customer.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Fornecedores Tab --- */}
        <TabsContent value="suppliers" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Fornecedores Cadastrados
                </CardTitle>
                <CardDescription>Gerencie os fornecedores da sua loja</CardDescription>
              </div>
              <Button onClick={openAddSupplierDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fornecedor por nome ou CNPJ..."
                    value={supplierSearchTerm}
                    onChange={(e) => setSupplierSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Carregando fornecedores...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome Jurídico</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum fornecedor encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.corporate_name}</TableCell>
                          <TableCell>{supplier.cnpj || "N/A"}</TableCell>
                          <TableCell>{supplier.phone || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => openEditSupplierDialog(supplier)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="icon" onClick={() => handleDeleteSupplier(supplier.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Adicionar/Editar Cliente */}
      <Dialog open={showAddEditCustomerDialog} onOpenChange={(open) => {
        setShowAddEditCustomerDialog(open);
        if (!open) {
          setEditingCustomer(null);
          setCustomerAddressesInModal([]);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          {editingCustomer || !editingCustomer ? ( // Render form even if not editing to allow adding
            <div className="space-y-6 py-4">
              <form onSubmit={handleSaveCustomer} className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Cliente
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerName">Nome</Label>
                  <Input
                    id="editCustomerName"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerPhone">Telefone</Label>
                  <Input
                    id="editCustomerPhone"
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                  />
                </div>
                {editingCustomer && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Cadastrado em: {new Date(editingCustomer.created_at).toLocaleDateString()}
                  </div>
                )}
                {editingCustomer && (
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <DollarSign className="h-4 w-4" />
                    Pontos de Fidelidade: {editingCustomer.points.toFixed(1)}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button type="submit">Salvar Alterações</Button>
                </div>
              </form>

              {editingCustomer && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Endereços Salvos
                    </h3>
                    <Button size="sm" onClick={openAddAddressForCustomer}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Endereço
                    </Button>
                  </div>
                  {customerAddressesInModal.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum endereço salvo para este cliente.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {customerAddressesInModal.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-3 border border-border rounded-lg space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            {addr.name.toLowerCase() === "casa" ? <Home className="h-4 w-4 text-muted-foreground" /> :
                               addr.name.toLowerCase() === "trabalho" ? <Briefcase className="h-4 w-4 text-muted-foreground" /> :
                               <MapPin className="h-4 w-4 text-muted-foreground" />}
                            <p className="font-medium">{addr.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditAddressForCustomer(addr)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => handleDeleteAddressInModal(addr.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.address}, {addr.number} - {addr.neighborhood}
                          </p>
                          {addr.reference && (
                            <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>
                          )}
                          {addr.cep && (
                            <p className="text-xs text-muted-foreground">CEP: {addr.cep}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Address Sub-Dialog (within Customer Edit Modal) */}
      <Dialog open={showAddEditAddressDialog} onOpenChange={(open) => {
        setShowAddEditAddressDialog(open);
        if (!open) { // Reset form when dialog closes
          setCurrentAddressForEdit(null);
          setAddressName("");
          setAddressStreet("");
          setAddressNumber("");
          setAddressNeighborhood("");
          setAddressReference("");
          setAddressCep("");
          setAddressSkipCep(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAddressForEdit ? "Editar Endereço" : "Adicionar Novo Endereço"} para {editingCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAddressInModal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressName">Nome do Endereço (Ex: Casa, Trabalho)</Label>
              <Input
                id="addressName"
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
                placeholder="Ex: Casa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">Rua</Label>
              <Input
                id="addressStreet"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Ex: Rua das Flores"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input
                id="addressNumber"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Ex: 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNeighborhood">Bairro</Label>
              <Input
                id="addressNeighborhood"
                value={addressNeighborhood}
                onChange={(e) => setAddressNeighborhood(e.target.value)}
                placeholder="Ex: Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressReference">Referência (Opcional)</Label>
              <Input
                id="addressReference"
                value={addressReference}
                onChange={(e) => setAddressReference(e.target.value)}
                placeholder="Ex: Próximo à padaria"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="addressCep">CEP</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setAddressSkipCep(!addressSkipCep)}
                >
                  {addressSkipCep ? "Informar CEP" : "Não sei o CEP"}
                </Button>
              </div>
              {!addressSkipCep && (
                <Input
                  id="addressCep"
                  value={addressCep}
                  onChange={(e) => setAddressCep(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEditAddressDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {currentAddressForEdit ? "Salvar Alterações" : "Adicionar Endereço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar/Editar Fornecedor */}
      <Dialog open={showAddEditSupplierDialog} onOpenChange={(open) => {
        setShowAddEditSupplierDialog(open);
        if (!open) {
          setEditingSupplier(null);
          setSupplierProducts([]);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <form onSubmit={handleSaveSupplier} className="space-y-4 border-b pb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados do Fornecedor
              </h3>
              <div className="space-y-2">
                <Label htmlFor="editSupplierCorporateName">Nome da Pessoa Jurídica</Label>
                <Input
                  id="editSupplierCorporateName"
                  value={editSupplierCorporateName}
                  onChange={(e) => setEditSupplierCorporateName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSupplierCnpj">CNPJ (Opcional)</Label>
                <Input
                  id="editSupplierCnpj"
                  value={editSupplierCnpj}
                  onChange={(e) => setEditSupplierCnpj(e.target.value.replace(/\D/g, ''))}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSupplierAddress">Endereço (Opcional)</Label>
                <Input
                  id="editSupplierAddress"
                  value={editSupplierAddress}
                  onChange={(e) => setEditSupplierAddress(e.target.value)}
                  placeholder="Rua Exemplo, 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSupplierPhone">Telefone (Opcional)</Label>
                <Input
                  id="editSupplierPhone"
                  type="tel"
                  value={editSupplierPhone}
                  onChange={(e) => setEditSupplierPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="(XX) XXXX-XXXX"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSupplierWhatsapp">WhatsApp (Opcional)</Label>
                <Input
                  id="editSupplierWhatsapp"
                  type="tel"
                  value={editSupplierWhatsapp}
                  onChange={(e) => setEditSupplierWhatsapp(e.target.value.replace(/\D/g, ''))}
                  placeholder="(XX) 9XXXX-XXXX"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>

            {editingSupplier && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Fornecidos
                  </h3>
                  <Button size="sm" onClick={handleAddSupplierProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={newSupplierProductId} onValueChange={setNewSupplierProductId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts
                        .filter(p => !supplierProducts.some(sp => sp.product_id === p.id)) // Filter out already linked products
                        .map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (R$ {product.price.toFixed(2)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Preço de Custo (Opcional)"
                    value={newSupplierProductCostPrice}
                    onChange={(e) => setNewSupplierProductCostPrice(e.target.value)}
                    className="w-36"
                  />
                  <Button onClick={handleAddSupplierProduct} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {supplierProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum produto vinculado a este fornecedor.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {supplierProducts.map((sp) => (
                      <div key={sp.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{sp.products?.name}</p>
                          {sp.cost_price !== null && (
                            <p className="text-sm text-muted-foreground">Custo: R$ {sp.cost_price.toFixed(2)}</p>
                          )}
                        </div>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteSupplierProduct(sp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
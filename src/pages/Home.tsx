import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "Dashboard & Caixa", description: "Abertura de caixa, relatórios diários de vendas e estoque." },
  { title: "PDV Integrado", description: "Ponto de Venda com atualização de estoque em tempo real e registro de reservas." },
  { title: "Programa de Fidelidade", description: "Cadastro via WhatsApp, regras customizáveis de pontuação e resgate de prêmios." },
  { title: "Painel de Pedidos", description: "Fila de pedidos em tempo real com status 'Em preparo' / 'Pronto'." },
  { title: "Relatórios Detalhados", description: "Análise de vendas, horários de pico e histórico completo de movimentação." },
  { title: "Gestão de Estoque", description: "Controle em tempo real de produtos e variações." },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header com Botão de Login */}
      <header className="p-6 border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Gestão Food Flow</h1>
          <Button onClick={() => navigate("/login")} className="shadow-soft">
            <LogIn className="h-4 w-4 mr-2" />
            Login
          </Button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Hero Section */}
          <section className="text-center py-16 bg-gradient-hero rounded-xl shadow-strong text-white">
            <h2 className="text-5xl font-extrabold mb-4">
              O Sistema Completo para seu Negócio de Assados
            </h2>
            <p className="text-xl font-light mb-8 max-w-3xl mx-auto">
              Gestão de pedidos, controle de estoque e programa de fidelidade em uma única plataforma.
            </p>
            <Button 
              onClick={() => navigate("/login")} 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 text-lg shadow-medium"
            >
              Acessar o Sistema
            </Button>
          </section>

          {/* Features Section */}
          <section className="space-y-6">
            <h3 className="text-3xl font-bold text-center text-foreground">Funcionalidades Chave</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Gestão Food Flow. Todos os direitos reservados.
      </footer>
    </div>
  );
}
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              O MetriCom Flow é um sistema interno de gestão que prioriza a proteção e privacidade dos dados dos nossos usuários. 
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais 
              quando você utiliza nosso aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Informações que Coletamos</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.1 Informações de Conta</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Coletamos informações fornecidas durante o registro, incluindo nome, email e dados de autenticação.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.2 Dados de Uso</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Registramos informações sobre como você utiliza o sistema, incluindo páginas visitadas, 
                  ações realizadas e tempo de uso para melhorar a experiência do usuário.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.3 Dados de Meta Ads</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Quando você conecta sua conta do Meta Ads, coletamos dados de campanhas, leads e métricas 
                  de performance conforme autorizado por você.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Como Usamos suas Informações</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Fornecer e manter os serviços do MetriCom Flow</li>
              <li>Processar e gerenciar leads e campanhas publicitárias</li>
              <li>Gerar relatórios e análises de performance</li>
              <li>Melhorar a funcionalidade e experiência do usuário</li>
              <li>Comunicar atualizações importantes do sistema</li>
              <li>Garantir a segurança e integridade da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto nas seguintes situações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Com seu consentimento explícito</li>
              <li>Para cumprir obrigações legais ou regulamentares</li>
              <li>Para proteger nossos direitos, propriedade ou segurança</li>
              <li>Com provedores de serviços que nos auxiliam na operação da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger suas informações 
              contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia, controles de 
              acesso e monitoramento contínuo para garantir a segurança dos dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos 
              nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Você tem os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Acessar e revisar suas informações pessoais</li>
              <li>Corrigir informações imprecisas ou incompletas</li>
              <li>Solicitar a exclusão de seus dados pessoais</li>
              <li>Restringir o processamento de suas informações</li>
              <li>Portabilidade dos dados</li>
              <li>Retirar o consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar a funcionalidade do sistema, personalizar 
              sua experiência e analisar o uso da plataforma. Você pode gerenciar suas preferências de cookies 
              através das configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças 
              significativas através do sistema ou por email. Recomendamos que revise esta política regularmente 
              para se manter informado sobre como protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, 
              entre em contato conosco através dos canais de suporte disponíveis no sistema.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD) e outras 
              regulamentações aplicáveis de proteção de dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
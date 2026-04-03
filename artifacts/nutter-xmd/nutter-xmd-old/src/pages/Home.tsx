import { Link } from "wouter";
import { TerminalSquare, Zap, Shield, Globe, ArrowRight, Activity, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <TerminalSquare className="w-6 h-6" />
            <span className="font-bold text-lg tracking-wider glow-text">NUTTER-XMD</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Terminal Login
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
                Initialize System
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center opacity-20 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/80 to-background" />
        </div>
        
        <div className="container mx-auto relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            System v2.4.0 Online
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Automate WhatsApp with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300 glitch-effect" data-text="Lethal Precision">Lethal Precision</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Deploy high-performance WhatsApp bots in seconds. Total control, absolute reliability, hacker-grade execution. Your digital operations center awaits.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
                Deploy Bot Instance
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-primary/50 text-primary hover:bg-primary/10">
                Access Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section className="py-10 border-y border-border/50 bg-secondary/20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Uptime</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">&lt;50ms</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Latency</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">10k+</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Active Instances</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">AES-256</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Encryption</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Command Core Specifications</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Engineered for those who demand total control over their communication infrastructure.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Zero-Latency Replies</h3>
              <p className="text-muted-foreground">Instantaneous command execution. Your bots respond before humans even realize they're talking to a machine.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Fortified Security</h3>
              <p className="text-muted-foreground">Military-grade session management. QR code authentication with immediate session revocation capabilities.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Custom Syntax</h3>
              <p className="text-muted-foreground">Define your own command prefixes and structures. Program exact response patterns for infinite automation scenarios.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="py-24 bg-card/30 relative z-10 border-y border-border/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-xl border border-border bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-primary/10">
            <div className="flex items-center px-4 py-2 border-b border-border/50 bg-black">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="mx-auto text-xs text-muted-foreground font-mono">root@nutter-xmd:~</div>
            </div>
            <div className="p-6 font-mono text-sm sm:text-base leading-relaxed">
              <div className="text-primary mb-2">nutterx login --session-token ********</div>
              <div className="text-muted-foreground mb-4">Authenticating with master node... [OK]</div>
              
              <div className="text-primary mb-2">nutterx bot create --name "Ops_Delta" --prefix "!"</div>
              <div className="text-muted-foreground mb-2">Allocating resources... [OK]</div>
              <div className="text-emerald-400 mb-4">Instance Ops_Delta created. ID: 8942-A</div>
              
              <div className="text-primary mb-2">nutterx bot start 8942-A</div>
              <div className="text-muted-foreground mb-2">Initializing Baileys connection...</div>
              <div className="text-muted-foreground mb-2">Generating QR Auth Matrix...</div>
              <div className="text-emerald-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                Connection Established. Ops_Delta is ONLINE.
              </div>
              
              <div className="flex">
                <span className="text-primary mr-2">root@nutter-xmd:~#</span>
                <span className="w-2 h-5 bg-foreground animate-pulse"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative z-10 text-center px-4">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Automate?</h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Join thousands of operators deploying high-performance WhatsApp infrastructure.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="h-14 px-10 text-lg bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
            Initialize System
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-background relative z-10 text-center md:text-left">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 text-primary mb-4 md:mb-0">
            <TerminalSquare className="w-5 h-5" />
            <span className="font-bold tracking-wider">NUTTER-XMD</span>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} NUTTER-XMD Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

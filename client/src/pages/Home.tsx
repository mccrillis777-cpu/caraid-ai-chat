import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageCircle, Sparkles } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  // Skip auth - go directly to chat
  useEffect(() => {
    setLocation('/chat');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            Meet Caraid
          </h1>
          <p className="text-xl text-muted-foreground">
            Your AI companion who actually gets it. Sarcastic, funny, caring—just like a real friend.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
          <div className="p-4 rounded-lg bg-card border border-border">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Natural Conversations</h3>
            <p className="text-sm text-muted-foreground">
              No robotic phrases. Just real, human-like dialogue.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <MessageCircle className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Picks Up On Cues</h3>
            <p className="text-sm text-muted-foreground">
              Understands your mood and responds accordingly.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Keeps It Real</h3>
            <p className="text-sm text-muted-foreground">
              Sarcastic, funny, and genuinely caring.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button
            size="lg"
            onClick={() => setLocation("/chat")}
            className="w-full md:w-auto"
          >
            Start Chatting with Caraid
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            No judgment. No corporate speak. Just genuine conversation.
          </p>
        </div>
      </div>
    </div>
  );
}

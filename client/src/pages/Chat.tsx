import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Fetch conversations
  const { data: conversations = [] } = trpc.chat.listConversations.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch current conversation
  const { data: currentChat, refetch: refetchConversation } = trpc.chat.getConversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  // Mutations
  const createConvMutation = trpc.chat.createConversation.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetchConversation();
    },
  });
  const retryMessageMutation = trpc.chat.retryMessage.useMutation({
    onSuccess: () => {
      refetchConversation();
    },
  });
  const deleteConvMutation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
    },
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChat?.messages]);

  // Set first conversation on load
  useEffect(() => {
    if (conversations.length > 0 && !conversationId) {
      setConversationId(conversations[0].id);
    }
  }, [conversations, conversationId]);

  const handleNewConversation = async () => {
    try {
      const newConv = await createConvMutation.mutateAsync({
        title: `Chat ${new Date().toLocaleDateString()}`,
      });
      setConversationId(newConv.id);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !conversationId || isLoading) return;

    const message = messageInput;
    setMessageInput("");
    setIsLoading(true);

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: message,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageInput(message); // Restore message on error
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!conversationId || isLoading) return;

    setIsLoading(true);
    try {
      await retryMessageMutation.mutateAsync({ conversationId });
    } catch (error) {
      console.error("Failed to retry message:", error);
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    try {
      await deleteConvMutation.mutateAsync({ conversationId: convId });
      await utils.chat.listConversations.invalidate();
      if (conversationId === convId) {
        setConversationId(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Please log in to chat with Caraid</p>
          <Button onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleNewConversation}
            className="w-full"
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${
                  conversationId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setConversationId(conv.id)}
              >
                <span className="truncate flex-1 text-sm">{conv.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {conversationId && currentChat ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-4 max-w-2xl mx-auto">
                {currentChat.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Start a conversation with Caraid</p>
                  </div>
                ) : (
                  currentChat.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <Card
                        className={`max-w-md p-4 ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Streamdown>{msg.content}</Streamdown>
                      </Card>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <Card className="bg-muted p-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border bg-card p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                {currentChat.messages.length > 0 &&
                  currentChat.messages[currentChat.messages.length - 1]
                    ?.sender === "assistant" && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Last Response
                    </Button>
                  )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Message Caraid..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !messageInput.trim()}
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                No conversation selected
              </p>
              <Button onClick={handleNewConversation}>Start New Chat</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

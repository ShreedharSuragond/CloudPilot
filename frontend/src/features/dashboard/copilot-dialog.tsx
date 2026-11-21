import * as React from 'react'
import {
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  Loader2,
  Sparkles,
  Terminal,
  User,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCopilotChatMutation } from './dashboard.mutations'

interface CopilotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuestion?: string
  initialQuery?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  provider?: string
}

const PRESET_PROMPTS = [
  'Break down our AWS Bedrock vs Vertex AI costs',
  'How do I fix public S3 bucket customer-data-lake-raw?',
  'Which models are active and what is their spend trend?',
  'Generate Terraform to enforce private endpoints for SageMaker',
]

export function CopilotDialog({
  open,
  onOpenChange,
  initialQuestion,
  initialQuery,
}: CopilotDialogProps) {
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am CloudPilot Copilot. I analyze multi-cloud resources, detect cost inefficiencies, and guide remediation for AI workloads and security drift. What would you like to explore?',
      provider: 'engine',
    },
  ])
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)
  const chatMutation = useCopilotChatMutation()
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const sendMessage = React.useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chatMutation.isPending) return

    setMessages((prev) => {
      const newMessages: Message[] = [...prev, { role: 'user', content: trimmed }]
      chatMutation.mutate(
        {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
        {
          onSuccess: (data) => {
            setMessages((current) => [
              ...current,
              {
                role: 'assistant',
                content: data.message,
                provider: data.provider,
              },
            ])
          },
          onError: (err) => {
            setMessages((current) => [
              ...current,
              {
                role: 'assistant',
                content: `Error contacting AI engine: ${err instanceof Error ? err.message : 'Unknown error'}`,
                provider: 'system',
              },
            ])
          },
        }
      )
      return newMessages
    })
    setInput('')
  }, [chatMutation])

  const initialSentRef = React.useRef(false)
  const questionToAsk = initialQuestion || initialQuery

  React.useEffect(() => {
    if (questionToAsk && open && !initialSentRef.current) {
      initialSentRef.current = true
      sendMessage(questionToAsk)
    }
    if (!open) {
      initialSentRef.current = false
    }
  }, [questionToAsk, open, sendMessage])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, chatMutation.isPending, scrollToBottom])

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">CloudPilot AI Copilot</DialogTitle>
                <DialogDescription className="text-xs">
                  Autonomous reasoning over your multi-cloud inventory, AI telemetry, and security policies.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              Pluggable AI
            </Badge>
          </div>
        </DialogHeader>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[300px] max-h-[440px]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] rounded-lg p-3.5 space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border text-foreground'
                }`}
              >
                {msg.role === 'assistant' && msg.provider && (
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40 text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Terminal className="size-3" />
                      Engine: {msg.provider}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {copiedIndex === idx ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              </div>

              {msg.role === 'user' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3 text-xs items-center text-muted-foreground animate-pulse">
              <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Loader2 className="size-4 animate-spin" />
              </div>
              <span className="text-xs">Analyzing cloud telemetry and synthesizing plan...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-border bg-muted/10 flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={chatMutation.isPending}
              onClick={() => sendMessage(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about spend, AI models, security posture, or remediation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
              className="flex-1 px-3 py-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || chatMutation.isPending}
              className="gap-1.5"
            >
              {chatMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="size-3.5" />
              )}
              Ask
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

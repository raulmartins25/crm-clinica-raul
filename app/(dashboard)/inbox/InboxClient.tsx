'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatMessageTime, getInitials, truncate, cn } from '@/lib/utils'
import {
  Search, Send, Paperclip, Phone, MoreVertical,
  Bot, BotOff, FileText, Mic, MicOff, X, Check, CheckCheck,
  MessageSquare, Download, Image as ImageIcon, StopCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Conversation {
  id: string
  remoteJid: string
  remotePhone: string
  remoteName: string | null
  remoteAvatarUrl: string | null
  unreadCount: number
  lastMessageAt: string | null
  lastMessageText: string | null
  aiEnabled: boolean
  agentId: string | null
  patient: { id: string; name: string; avatarUrl: string | null } | null
  agent: { id: string; name: string } | null
}

interface Message {
  id: string
  conversationId: string
  externalId: string | null
  direction: 'INBOUND' | 'OUTBOUND'
  type: string
  content: string | null
  mediaUrl: string | null
  mediaName: string | null
  mediaMimeType: string | null
  status: string
  isFromAI: boolean
  timestamp: string
  sentBy: { id: string; name: string; avatarUrl: string | null } | null
}

interface SessionUser { id: string; clinicId: string; name: string; email: string; role: string; avatarUrl: string | null }

export function InboxClient({ session }: { session: SessionUser }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  // Audio recording state
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const convPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgIdRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedConvRef = useRef<Conversation | null>(null)

  // Keep ref in sync for use inside intervals
  useEffect(() => { selectedConvRef.current = selectedConv }, [selectedConv])

  const fetchConversations = useCallback(async (silent = false) => {
    const res = await fetch(`/api/conversations?search=${encodeURIComponent(searchQuery)}`)
    if (res.ok) {
      const data = await res.json()
      setConversations(data.conversations)
    }
  }, [searchQuery])

  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true)
    const res = await fetch(`/api/conversations/${convId}/messages`)
    if (res.ok) {
      const data = await res.json()
      const newMsgs: Message[] = data.messages
      setMessages(prev => {
        // Smart update: only update if there are new messages
        const lastPrev = prev[prev.length - 1]?.id
        const lastNew = newMsgs[newMsgs.length - 1]?.id
        if (lastPrev === lastNew) return prev // no change, avoid re-render
        lastMsgIdRef.current = lastNew || null
        return newMsgs
      })
    }
    if (!silent) setLoadingMessages(false)
  }, [])

  useEffect(() => {
    fetchConversations()
    fetch('/api/agents').then(r => r.json()).then(d => setAgents(d.agents || []))

    // Poll conversations every 5s
    convPollingRef.current = setInterval(() => fetchConversations(true), 5000)
    return () => {
      if (convPollingRef.current) clearInterval(convPollingRef.current)
    }
  }, [fetchConversations])

  // Poll messages every 3s when a conversation is selected
  useEffect(() => {
    if (msgPollingRef.current) clearInterval(msgPollingRef.current)
    if (!selectedConv) return
    msgPollingRef.current = setInterval(() => {
      const conv = selectedConvRef.current
      if (conv) fetchMessages(conv.id, true)
    }, 3000)
    return () => {
      if (msgPollingRef.current) clearInterval(msgPollingRef.current)
    }
  }, [selectedConv?.id, fetchMessages])

  useEffect(() => {
    // Only scroll to bottom when new message arrives, not on silent polls
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv)
    setMessages([])
    lastMsgIdRef.current = null
    await fetchMessages(conv.id)
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    )
  }

  const sendMessage = async (file?: File) => {
    if (!selectedConv) return
    if (!inputText.trim() && !file) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('conversationId', selectedConv.id)
      if (inputText.trim()) formData.append('text', inputText.trim())
      if (file) formData.append('file', file)

      const res = await fetch('/api/whatsapp/send', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'Falha ao enviar')

      setMessages(prev => [...prev, data.message])
      setInputText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) sendMessage(file)
    e.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
        await sendMessage(file)
        setRecordingSeconds(0)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      toast.error('Permissão de microfone negada')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setRecording(false)
    setRecordingSeconds(0)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const toggleAgent = async (agentId: string | null) => {
    if (!selectedConv) return
    const aiEnabled = agentId !== null
    const res = await fetch(`/api/conversations/${selectedConv.id}/toggle-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiEnabled, agentId }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelectedConv(prev => prev ? { ...prev, aiEnabled: data.conversation.aiEnabled, agentId: data.conversation.agentId } : null)
      toast.success(aiEnabled ? 'Agente IA ativado' : 'Agente IA desativado')
    }
    setShowAgentMenu(false)
  }

  const displayName = (conv: Conversation) =>
    conv.patient?.name || conv.remoteName || conv.remotePhone

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex h-full bg-gray-50">
      {/* Conversation List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              Inbox
              {totalUnread > 0 && (
                <span className="bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
            <button
              onClick={async () => {
                const id = toast.loading('Sincronizando...')
                try {
                  const res = await fetch('/api/whatsapp/sync', { method: 'POST' })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error)
                  toast.success(`${data.synced || 0} conversas sincronizadas.`, { id })
                  fetchConversations()
                } catch (err: any) {
                  toast.error(err.message || 'Erro ao sincronizar', { id })
                }
              }}
              className="text-xs text-sky-600 font-medium hover:text-sky-700 hover:bg-sky-50 px-2 py-1 rounded transition"
            >
              Sincronizar
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50',
                  selectedConv?.id === conv.id && 'bg-sky-50 border-l-2 border-l-sky-500'
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm">
                    {getInitials(displayName(conv))}
                  </div>
                  {conv.aiEnabled && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Bot className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName(conv)}</p>
                    <p className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {conv.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">
                      {truncate(conv.lastMessageText || '', 36)}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-sky-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm flex-shrink-0">
              {getInitials(displayName(selectedConv))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{displayName(selectedConv)}</p>
              <p className="text-xs text-gray-400">{selectedConv.remotePhone}</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowAgentMenu(!showAgentMenu)}
                  title={selectedConv.aiEnabled ? 'Agente IA ativo' : 'Ativar agente IA'}
                  className={cn(
                    'p-2 rounded-lg transition',
                    selectedConv.aiEnabled
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'text-gray-400 hover:bg-gray-100'
                  )}
                >
                  {selectedConv.aiEnabled ? <Bot className="w-5 h-5" /> : <BotOff className="w-5 h-5" />}
                </button>
                {showAgentMenu && (
                  <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-48 py-1">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agentes IA</p>
                    {agents.map(ag => (
                      <button
                        key={ag.id}
                        onClick={() => toggleAgent(ag.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition',
                          selectedConv.agentId === ag.id && 'text-sky-600 bg-sky-50'
                        )}
                      >
                        {ag.name}
                      </button>
                    ))}
                    {selectedConv.aiEnabled && (
                      <button
                        onClick={() => toggleAgent(null)}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100"
                      >
                        Desativar agente
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-5 space-y-2"
            style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#f8fafc' }}
          >
            {loadingMessages ? (
              <div className="flex justify-center pt-8">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} currentUserId={session.id} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-4 py-3">
            {recording ? (
              /* Recording UI */
              <div className="flex items-center gap-3 py-1">
                <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 font-medium">Gravando... {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition flex-shrink-0 mb-0.5"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                  onChange={handleFileChange}
                />
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="w-full resize-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition max-h-28 overflow-y-auto"
                  />
                </div>
                {inputText.trim() ? (
                  <button
                    onClick={() => sendMessage()}
                    disabled={sending}
                    className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition disabled:opacity-40 flex-shrink-0 mb-0.5"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="p-2.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition flex-shrink-0 mb-0.5"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <MessageSquare className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <h3 className="text-gray-500 font-medium">Selecione uma conversa</h3>
            <p className="text-gray-400 text-sm mt-1">Escolha uma conversa na lista à esquerda</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isOut = message.direction === 'OUTBOUND'
  const mediaProxyUrl = message.externalId
    ? `/api/whatsapp/media?id=${encodeURIComponent(message.externalId)}`
    : null

  const statusIcon = () => {
    if (!isOut) return null
    switch (message.status) {
      case 'READ': return <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
      case 'DELIVERED': return <CheckCheck className="w-3.5 h-3.5 text-white/60" />
      default: return <Check className="w-3.5 h-3.5 text-white/60" />
    }
  }

  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <div>
            {mediaProxyUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaProxyUrl}
                alt="imagem"
                className="rounded-lg max-w-xs max-h-60 object-cover cursor-pointer"
                onClick={() => window.open(mediaProxyUrl, '_blank')}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="flex items-center gap-2 opacity-70 py-1">
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm">Imagem</span>
              </div>
            )}
            {message.content && <p className="text-sm mt-1">{message.content}</p>}
          </div>
        )
      case 'AUDIO':
        return (
          <div className="min-w-48">
            {mediaProxyUrl ? (
              <audio controls className="max-w-xs h-10" style={{ minWidth: '200px' }}>
                <source src={mediaProxyUrl} />
              </audio>
            ) : (
              <div className="flex items-center gap-2 opacity-70">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Áudio</span>
              </div>
            )}
          </div>
        )
      case 'DOCUMENT':
        return (
          <div className="flex items-center gap-2 max-w-xs">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.mediaName || 'Documento'}</p>
              <p className="text-xs opacity-70">{message.mediaMimeType?.split('/')[1]?.toUpperCase()}</p>
            </div>
            {mediaProxyUrl && (
              <a
                href={mediaProxyUrl}
                download={message.mediaName || 'documento'}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-black/10 transition"
                onClick={e => e.stopPropagation()}
              >
                <Download className="w-4 h-4 flex-shrink-0" />
              </a>
            )}
          </div>
        )
      case 'VIDEO':
        return (
          <div>
            {mediaProxyUrl ? (
              <video controls className="rounded-lg max-w-xs max-h-48">
                <source src={mediaProxyUrl} type={message.mediaMimeType || 'video/mp4'} />
              </video>
            ) : (
              <div className="flex items-center gap-2 opacity-70">
                <FileText className="w-5 h-5" />
                <span className="text-sm">Vídeo</span>
              </div>
            )}
          </div>
        )
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word' }}>
            {message.content}
          </p>
        )
    }
  }

  return (
    <div className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] flex flex-col', isOut ? 'items-end' : 'items-start')}>
        {message.isFromAI && (
          <span className="text-xs text-green-500 mb-1 flex items-center gap-1">
            <Bot className="w-3 h-3" /> IA
          </span>
        )}
        <div className={cn(
          'rounded-2xl px-3 py-2 shadow-sm',
          isOut
            ? 'bg-sky-500 text-white rounded-tr-sm'
            : 'bg-white text-gray-900 rounded-tl-sm border border-gray-100'
        )}>
          {renderContent()}
          <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
            <span className={cn('text-xs', isOut ? 'text-white/70' : 'text-gray-400')}>
              {formatMessageTime(message.timestamp)}
            </span>
            {statusIcon()}
          </div>
        </div>
      </div>
    </div>
  )
}

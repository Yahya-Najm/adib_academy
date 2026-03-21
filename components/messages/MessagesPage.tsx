"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import {
  getContacts,
  getConversations,
  getConversation,
  getGeneralMessages,
  sendMessage,
  getUnreadCount,
} from "@/app/actions/messages";

type Contact = Awaited<ReturnType<typeof getContacts>>[number];
type Conversation = Awaited<ReturnType<typeof getConversations>>[number];
type ConversationData = Awaited<ReturnType<typeof getConversation>>;
type GeneralMessage = Awaited<ReturnType<typeof getGeneralMessages>>[number];

const ACCENT_CLASSES: Record<string, { button: string; ring: string; tab: string }> = {
  orange: {
    button: "bg-orange-600 hover:bg-orange-700",
    ring: "focus:ring-orange-500",
    tab: "border-orange-600 text-orange-700",
  },
  teal: {
    button: "bg-teal-600 hover:bg-teal-700",
    ring: "focus:ring-teal-500",
    tab: "border-teal-600 text-teal-700",
  },
  dark: {
    button: "bg-gray-800 hover:bg-gray-900",
    ring: "focus:ring-gray-400",
    tab: "border-gray-900 text-gray-900",
  },
};

function roleBadge(role: string) {
  if (role === "GENERAL_MANAGER") return "bg-orange-100 text-orange-700";
  if (role === "MANAGER") return "bg-teal-100 text-teal-700";
  if (role === "TEACHER") return "bg-gray-100 text-gray-600";
  return "bg-gray-100 text-gray-600";
}

function roleLabel(role: string) {
  if (role === "GENERAL_MANAGER") return "GM";
  if (role === "MANAGER") return "Manager";
  if (role === "TEACHER") return "Teacher";
  return role;
}

function timeAgo(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MessagesPage({
  accent = "teal",
  userId,
}: {
  accent?: "orange" | "teal" | "dark";
  userId: string;
}) {
  const ac = ACCENT_CLASSES[accent] || ACCENT_CLASSES.teal;
  const [tab, setTab] = useState<"inbox" | "general" | "new">("inbox");
  const [isPending, startTransition] = useTransition();

  // Inbox
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [convoData, setConvoData] = useState<ConversationData | null>(null);
  const [replyText, setReplyText] = useState("");

  // General
  const [generalMessages, setGeneralMessages] = useState<GeneralMessage[]>([]);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [generalText, setGeneralText] = useState("");

  // New message
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [newText, setNewText] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // Unread badge
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(() => {
    setLoadingConvos(true);
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvos(false));
  }, []);

  const loadGeneral = useCallback(() => {
    setLoadingGeneral(true);
    getGeneralMessages()
      .then(setGeneralMessages)
      .catch(() => setGeneralMessages([]))
      .finally(() => setLoadingGeneral(false));
  }, []);

  useEffect(() => {
    getContacts().then(setContacts).catch(() => {});
    getUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "inbox") loadConversations();
    if (tab === "general") loadGeneral();
  }, [tab, loadConversations, loadGeneral]);

  useEffect(() => {
    if (selectedConvo) {
      getConversation(selectedConvo).then((data) => {
        setConvoData(data);
        getUnreadCount().then(setUnreadCount).catch(() => {});
      }).catch(() => setConvoData(null));
    }
  }, [selectedConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convoData?.messages, generalMessages]);

  function handleSendReply() {
    if (!replyText.trim() || !selectedConvo) return;
    startTransition(async () => {
      try {
        await sendMessage({ receiverId: selectedConvo, channel: "DIRECT", content: replyText });
        setReplyText("");
        const data = await getConversation(selectedConvo);
        setConvoData(data);
        loadConversations();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to send");
      }
    });
  }

  function handleSendGeneral() {
    if (!generalText.trim()) return;
    startTransition(async () => {
      try {
        await sendMessage({ channel: "GENERAL", content: generalText });
        setGeneralText("");
        loadGeneral();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to send");
      }
    });
  }

  function handleSendNew() {
    setSendError("");
    setSendSuccess(false);
    if (!newRecipient || !newText.trim()) return;
    startTransition(async () => {
      try {
        await sendMessage({ receiverId: newRecipient, channel: "DIRECT", content: newText });
        setNewText("");
        setNewRecipient("");
        setContactSearch("");
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
        loadConversations();
      } catch (e) {
        setSendError(e instanceof Error ? e.message : "Failed to send");
      }
    });
  }

  const filteredContacts = contactSearch
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send and receive messages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button onClick={() => { setTab("inbox"); setSelectedConvo(null); setConvoData(null); }}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === "inbox" ? ac.tab : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          Inbox
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {totalUnread}
            </span>
          )}
        </button>
        <button onClick={() => setTab("general")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "general" ? ac.tab : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          General
        </button>
        <button onClick={() => setTab("new")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "new" ? ac.tab : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          New Message
        </button>
      </div>

      {/* ── Inbox Tab ── */}
      {tab === "inbox" && !selectedConvo && (
        <div>
          {loadingConvos ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No conversations yet. Send a new message to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(c => (
                <button key={c.otherUserId} onClick={() => setSelectedConvo(c.otherUserId)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{c.otherName}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge(c.otherRole)}`}>
                          {roleLabel(c.otherRole)}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {c.isMine && <span className="text-gray-400">You: </span>}
                        {c.lastMessage}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Conversation View ── */}
      {tab === "inbox" && selectedConvo && (
        <div>
          <button onClick={() => { setSelectedConvo(null); setConvoData(null); loadConversations(); }}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            <span>&larr;</span> Back to inbox
          </button>

          {convoData?.otherUser && (
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{convoData.otherUser.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge(convoData.otherUser.role)}`}>
                {roleLabel(convoData.otherUser.role)}
              </span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto p-5 space-y-3">
              {convoData?.messages.map(msg => {
                const isMine = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMine ? "bg-gray-100 text-gray-900" : "bg-blue-50 text-gray-900"}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                placeholder="Type a message..."
                className={`flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ac.ring}`}
              />
              <button onClick={handleSendReply} disabled={isPending || !replyText.trim()}
                className={`${ac.button} text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50`}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── General Tab ── */}
      {tab === "general" && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto p-5 space-y-3">
              {loadingGeneral ? (
                <div className="text-gray-400 text-sm">Loading...</div>
              ) : generalMessages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No messages in the general channel yet.
                </div>
              ) : (
                generalMessages.map(msg => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMine ? "bg-gray-100" : "bg-blue-50"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{msg.sender.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadge(msg.sender.role)}`}>
                            {roleLabel(msg.sender.role)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4 flex gap-2">
              <input
                type="text"
                value={generalText}
                onChange={e => setGeneralText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendGeneral()}
                placeholder="Post to general channel..."
                className={`flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ac.ring}`}
              />
              <button onClick={handleSendGeneral} disabled={isPending || !generalText.trim()}
                className={`${ac.button} text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50`}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Message Tab ── */}
      {tab === "new" && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            {sendError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{sendError}</p>}
            {sendSuccess && <p className="text-green-700 text-sm bg-green-50 px-3 py-2 rounded-lg">Message sent successfully.</p>}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Recipient *</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={contactSearch}
                onChange={e => { setContactSearch(e.target.value); setNewRecipient(""); }}
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ac.ring} mb-2`}
              />
              {filteredContacts.length > 0 && !newRecipient && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredContacts.map(c => (
                    <button key={c.id} onClick={() => { setNewRecipient(c.id); setContactSearch(c.name); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <span className="text-gray-700">{c.name}</span>
                      <div className="flex items-center gap-2">
                        {c.branch && <span className="text-xs text-gray-400">{c.branch.name}</span>}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge(c.role)}`}>
                          {roleLabel(c.role)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {newRecipient && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Sending to: {contacts.find(c => c.id === newRecipient)?.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Message *</label>
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                rows={4}
                placeholder="Write your message..."
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ac.ring} resize-none`}
              />
            </div>

            <button onClick={handleSendNew} disabled={isPending || !newRecipient || !newText.trim()}
              className={`w-full ${ac.button} text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50`}>
              {isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

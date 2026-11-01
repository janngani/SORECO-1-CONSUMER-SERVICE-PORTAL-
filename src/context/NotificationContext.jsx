import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { supabase } from "@/src/lib/supabase";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastViewedRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const lastViewed = localStorage.getItem(`lastViewedBellTime_${user.id || user.uid}`) || "1970-01-01T00:00:00.000Z";
      lastViewedRef.current = lastViewed;
      let list = [];
      let count = 0;

      if (isAdmin) {
        const [tickets, inquiries] = await Promise.all([
          api.tickets.list().catch(() => []),
          api.inquiries.list().catch(() => [])
        ]);

        tickets.forEach(t => {
          const date = t.createdAt || t.createdat;
          let messages = typeof t.messages === "string" ? JSON.parse(t.messages || "[]") : (t.messages || []);
          if (t.status === "pending") {
            list.push({ id: `ticket-${t.id}`, title: "New Ticket", description: `${t.consumerName}: ${t.category}`, link: `/ticket/${t.id}`, date });
            if (new Date(date) > new Date(lastViewed)) count++;
          } else if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId !== "admin" && lastMsg.senderId !== "system" && !lastMsg.isAdmin) {
              list.push({ id: `msg-${t.id}-${lastMsg.timestamp}`, title: `Message in Ticket #${t.id}`, description: `${lastMsg.senderName}: ${lastMsg.text}`, link: `/ticket/${t.id}`, date: lastMsg.timestamp });
              if (new Date(lastMsg.timestamp) > new Date(lastViewed)) count++;
            }
          }
        });
        inquiries.forEach(inq => {
          const msgs = inq.messages || [];
          if (msgs.length === 0 || msgs[msgs.length-1].senderId !== "admin") {
            const date = msgs[msgs.length-1]?.createdAt || inq.createdAt;
            list.push({ id: `inq-${inq.id}`, title: "Inquiry", description: `${inq.fullName}: ${inq.subject}`, link: `/admin?tab=inquiries`, date });
            if (new Date(date) > new Date(lastViewed)) count++;
          }
        });
      } else {
        const tickets = await api.tickets.list().catch(() => []);
        tickets.forEach(t => {
          let messages = typeof t.messages === "string" ? JSON.parse(t.messages || "[]") : (t.messages || []);
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && (lastMsg.senderId === "admin" || lastMsg.isAdmin)) {
            list.push({ id: `msg-${t.id}-${lastMsg.timestamp}`, title: `Update: ${t.category}`, description: `${lastMsg.senderName}: ${lastMsg.text}`, link: `/ticket/${t.id}`, date: lastMsg.timestamp });
            if (new Date(lastMsg.timestamp) > new Date(lastViewed)) count++;
          }
        });
      }
      setNotifications(list.sort((a,b) => new Date(b.date) - new Date(a.date)));
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase.channel('realtime-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetchNotifications)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchNotifications]);

  const markAllAsRead = () => {
    if (user) {
      localStorage.setItem(`lastViewedBellTime_${user.id || user.uid}`, new Date().toISOString());
    }
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

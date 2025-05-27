import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import styles from '@/styles/Chat.module.css';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  fileId: string;
  clauses: any[];
  isOpen: boolean;
  onClose: () => void;
  fullText?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ fileId, clauses, isOpen, onClose, fullText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I can answer questions about this contract. What would you like to know?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: text
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      // Prepare messages for API
      const apiMessages = messages
        .filter(msg => msg.role !== 'system') // Filter out system messages
        .concat(userMessage);

      // Call the API
      const response = await fetch('/.netlify/functions/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          messages: apiMessages,
          clauses,
          fullText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'Sorry, I couldn\'t process that request.'
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages, 
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.chatPanelOverlay}>
      <div ref={panelRef} className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <h3 className={styles.chatTitle}>Ask about the Contract</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.chatBody}>
          <MessageList messages={messages} />
        </div>
        
        <div className={styles.chatFooter}>
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
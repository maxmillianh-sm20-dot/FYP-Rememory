import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { useTTS } from '@hooks/useTTS';
import { chatWithPersona, fetchMessages } from '@services/api';
export const PersonaChat = ({ persona }) => {
    const { token } = useAuth();
    const { speak, isSpeaking, cancel } = useTTS();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messageListRef = useRef(null);
    const loadMessages = useCallback(async () => {
        if (!token)
            return;
        const history = await fetchMessages(persona.id, token);
        setMessages(history);
    }, [persona.id, token]);
    useEffect(() => {
        void loadMessages();
    }, [loadMessages]);
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);
    const onSubmit = async (event) => {
        event.preventDefault();
        if (!input.trim() || !token || persona.status !== 'active')
            return;
        const text = input.trim();
        setMessages((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                sender: 'user',
                text,
                timestamp: new Date().toISOString()
            }
        ]);
        setInput('');
        setLoading(true);
        try {
            const response = await chatWithPersona(persona.id, text, token);
            setMessages((prev) => [...prev, ...response.messages]);
            const aiMessage = response.messages.find((msg) => msg.sender === 'ai');
            if (aiMessage) {
                speak(aiMessage.text);
            }
        }
        catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    sender: 'system',
                    text: 'Something went wrong. Please try again shortly.',
                    timestamp: new Date().toISOString()
                }
            ]);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("section", { "aria-label": `Chat with ${persona.name}`, className: "chat-card", children: [_jsxs("div", { className: "chat-header", children: [_jsx("h2", { children: persona.name }), _jsx("p", { className: "simulation-banner", children: "This is a supportive simulation of your loved one. For urgent help, contact local emergency services or the 988 Lifeline." })] }), _jsx("div", { ref: messageListRef, className: "chat-messages", role: "log", "aria-live": "polite", children: messages.map((message) => (_jsxs("div", { className: `bubble bubble-${message.sender}`, children: [_jsx("span", { className: "bubble-sender", children: message.sender === 'ai' ? persona.name : message.sender === 'user' ? 'You' : 'System' }), _jsx("p", { children: message.text })] }, message.id))) }), _jsxs("form", { onSubmit: onSubmit, className: "chat-form", "aria-disabled": persona.status !== 'active', children: [_jsx("label", { htmlFor: "chat-input", className: "sr-only", children: "Message" }), _jsx("textarea", { id: "chat-input", value: input, onChange: (event) => setInput(event.target.value), placeholder: "Share a memory or ask a question...", maxLength: 1000, required: true, disabled: persona.status !== 'active' || loading }), _jsxs("div", { className: "chat-actions", children: [_jsx("button", { type: "submit", disabled: loading || persona.status !== 'active', children: loading ? 'Sending...' : 'Send' }), _jsx("button", { type: "button", onClick: cancel, disabled: !isSpeaking, children: "Stop voice" })] })] })] }));
};

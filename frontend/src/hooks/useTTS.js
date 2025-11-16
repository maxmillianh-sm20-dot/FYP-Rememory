import { useCallback, useState } from 'react';
export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const speak = useCallback((text) => {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);
    const cancel = useCallback(() => {
        if (!('speechSynthesis' in window))
            return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);
    return { speak, cancel, isSpeaking };
};

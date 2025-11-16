import { jsx as _jsx } from "react/jsx-runtime";
import { getIdToken } from 'firebase/auth';
import { createContext, useCallback, useContext, useState } from 'react';
import { fetchPersona } from '@services/api';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [persona, setPersona] = useState(null);
    const refreshPersona = useCallback(async () => {
        if (!user) {
            setPersona(null);
            setToken(null);
            return;
        }
        const freshToken = await getIdToken(user, true);
        setToken(freshToken);
        const data = await fetchPersona(freshToken);
        setPersona(data);
    }, [user]);
    const value = {
        user,
        token,
        persona,
        setUser,
        refreshPersona
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

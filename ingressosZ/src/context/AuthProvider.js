import { jsx as _jsx } from "react/jsx-runtime";
import { auth } from "@/firebaseConfig";
import { userService } from "@/services/firestore";
import { logger } from "@/services/logger";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { AuthContext } from "./authContext";
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                let profile = await userService.getUserProfile(currentUser.uid);
                if (!profile) {
                    const newUserProfile = {
                        email: currentUser.email || "",
                        displayName: currentUser.displayName || "",
                        phone: currentUser.phoneNumber || "",
                        role: "user",
                        avatarUrl: currentUser.photoURL || "",
                    };
                    await userService.createUserProfile(currentUser.uid, newUserProfile);
                    profile = await userService.getUserProfile(currentUser.uid);
                }
                let roleFromClaims = profile?.role || "user";
                try {
                    const tokenResult = await currentUser.getIdTokenResult();
                    const claimsRole = tokenResult.claims.role;
                    const isAdmin = tokenResult.claims.admin === true;
                    if (isAdmin) {
                        roleFromClaims = "admin";
                    }
                    else if (typeof claimsRole === "string") {
                        const normalized = claimsRole.toLowerCase();
                        if (normalized === "user" ||
                            normalized === "organizer" ||
                            normalized === "validator" ||
                            normalized === "admin") {
                            roleFromClaims = normalized;
                        }
                    }
                }
                catch {
                    roleFromClaims = profile?.role || "user";
                }
                if (profile && profile.role !== roleFromClaims) {
                    await userService.updateUserProfile(currentUser.uid, {
                        role: roleFromClaims,
                    });
                    profile = { ...profile, role: roleFromClaims };
                }
                setUserProfile(profile || null);
            }
            else {
                setUserProfile(null);
            }
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    useEffect(() => {
        getRedirectResult(auth)
            .then(async (result) => {
            if (result?.user) {
                const { user: authUser } = result;
                const profile = await userService.getUserProfile(authUser.uid);
                if (!profile) {
                    const newUserProfile = {
                        email: authUser.email || "",
                        displayName: authUser.displayName || "",
                        phone: authUser.phoneNumber || "",
                        role: "user",
                        avatarUrl: authUser.photoURL || "",
                    };
                    await userService.createUserProfile(authUser.uid, newUserProfile);
                }
            }
        })
            .catch((error) => {
            logger.error("Erro no login com redirecionamento", error);
        });
    }, []);
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
        }
        catch (error) {
            logger.error("Erro ao fazer logout", error);
        }
    };
    const getFreshIdToken = async () => {
        if (!user)
            return null;
        try {
            const token = await user.getIdToken(true);
            return token;
        }
        catch {
            return null;
        }
    };
    const getAuthHeaders = async () => {
        const token = await getFreshIdToken();
        if (!token)
            return {};
        return { Authorization: `Bearer ${token}` };
    };
    const value = {
        user,
        userProfile,
        loading,
        signOut: handleSignOut,
        getFreshIdToken,
        getAuthHeaders,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}

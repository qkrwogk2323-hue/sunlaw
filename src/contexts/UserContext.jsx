"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { v4 as uuidv4 } from "uuid";
import {
  isDevBypassEnabled,
  getDevRole,
  buildDevUser,
} from "@/utils/devAuth";

// 카카오 API로 사용자 정보 가져오기
async function fetchKakaoProfile(accessToken) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  if (!response.ok) {
    throw new Error(`카카오 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createClientUserFromSession(session) {
  let kakaoProfile = null;

  if (session?.accessToken) {
    try {
      kakaoProfile = await fetchKakaoProfile(session.accessToken);
    } catch (error) {
      console.error("UserContext: 카카오 추가 정보 조회 실패:", error);
    }
  }

  const kakaoAccount = kakaoProfile?.kakao_account || {};
  const gender = kakaoAccount.gender || null;
  const phone_number = kakaoAccount.phone_number || null;

  let birth_date = null;
  if (kakaoAccount.birthyear && kakaoAccount.birthday) {
    try {
      birth_date = `${kakaoAccount.birthyear}-${kakaoAccount.birthday.slice(
        0,
        2
      )}-${kakaoAccount.birthday.slice(2, 4)}`;
    } catch (error) {
      console.error("UserContext: 생년월일 처리 오류:", error);
    }
  }

  const newUser = {
    id: uuidv4(),
    email: session.user.email,
    name: session.user.name || "",
    nickname: session.user.name || "",
    profile_image: session.user.image || "",
    phone_number,
    gender,
    birth_date,
    role: "client",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("users")
    .insert(newUser)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// 사용자 컨텍스트 생성
const UserContext = createContext(undefined);

// 사용자 컨텍스트 제공자 컴포넌트
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  useEffect(() => {
    let cancelled = false;

    const syncUser = async () => {
      if (status === "loading") {
        return;
      }

      setLoading(true);

      try {
        // 개발용 인증 우회
        if (isDevBypassEnabled()) {
          const devUser = buildDevUser(getDevRole());
          if (!cancelled) {
            setUser(devUser);
          }
          return;
        }

        // 로그인 안 된 상태
        if (!session?.user?.email) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        // 기존 사용자 조회
        let dbUser = await findUserByEmail(session.user.email);

        // 없으면 새 사용자 생성
        if (!dbUser) {
          dbUser = await createClientUserFromSession(session);
        }

        if (!cancelled) {
          setUser({
            ...session.user,
            ...dbUser,
            supabaseId: dbUser.id,
          });
        }
      } catch (error) {
        console.error("UserContext bootstrap error:", error);

        if (!cancelled) {
          setUser(null);
          toast.error("사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    syncUser();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const isAdmin = () => user?.role === "admin";
  const isStaff = () => user?.role === "staff";
  const isClient = () => user?.role === "client";
  const isExternalStaff = () =>
    user?.role === "staff" && user?.employee_type === "external";
  const isInternalStaff = () =>
    user?.role === "staff" && user?.employee_type === "internal";

  const signOut = async () => {
    try {
      await nextAuthSignOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("UserContext: 로그아웃 오류:", error);
      toast.error("로그아웃 중 오류가 발생했습니다");
    }
  };

  const updateUserProfile = async (updatedData) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      throw new Error("로그인이 필요합니다");
    }

    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "프로필 업데이트에 실패했습니다");
      }

      const data = await response.json();
      setUser((prev) => ({ ...prev, ...data }));
      toast.success("프로필이 업데이트되었습니다");
      return data;
    } catch (error) {
      console.error("UserContext: 프로필 업데이트 오류:", error);
      toast.error(error.message || "프로필 업데이트에 실패했습니다");
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        signOut,
        isAdmin,
        isStaff,
        isClient,
        isExternalStaff,
        isInternalStaff,
        updateUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// 사용자 컨텍스트 사용 훅
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser는 UserProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

interface Me {
  username: string;
  avatarUrl: string;
}

export default function UserMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    // 401 이면 api() 가 /login 으로 보내므로 여기서는 실패를 무시한다
    api<Me>("/api/me").then(setMe, () => {});
  }, []);

  if (!me) return null;
  return (
    <div className="ml-auto flex items-center gap-2">
      {me.avatarUrl && (
        // GitHub 아바타 도메인을 next/image 설정에 추가하지 않으려고 img 를 쓴다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={me.avatarUrl}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full border border-slate-200"
        />
      )}
      <span className="hidden text-sm font-medium text-slate-700 sm:inline">
        {me.username}
      </span>
      <form action="/auth/logout" method="post">
        <button type="submit" className="btn-ghost px-2 py-1 text-xs">
          로그아웃
        </button>
      </form>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import PageState from "@/components/shared/PageState";
import { useInitialData } from "@/lib/useInitialData";

// dnd-kit 은 서버 렌더링 시 aria id 가 어긋나 hydration 경고를 내므로 클라이언트에서만 렌더링
const KanbanBoard = dynamic(() => import("@/components/todos/KanbanBoard"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">보드를 준비하는 중…</p>,
});

export default function TodosPage() {
  const { loaded, error } = useInitialData();

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        카드를 끌어서 상태와 순서를 바꾸고, 눌러서 내용을 수정합니다. High 우선순위는
        컬럼 상단에 고정됩니다.
      </p>
      <PageState loaded={loaded} error={error} />
      <KanbanBoard />
    </div>
  );
}

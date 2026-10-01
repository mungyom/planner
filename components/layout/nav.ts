export const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/todos", label: "할일 보드" },
  { href: "/weekly", label: "주간 계획" },
  { href: "/goals", label: "1년 목표" },
];

/** 로그인 전에 보는 화면: 앱 메뉴를 숨긴다 */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login";
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

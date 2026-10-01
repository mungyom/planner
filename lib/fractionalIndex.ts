import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

// 같은 자리에 반복 삽입하면 키가 길어진다. 이 길이를 넘으면 컬럼 전체를 재정규화한다.
export const MAX_KEY_LENGTH = 32;

export function keyBetween(prev?: string | null, next?: string | null): string {
  return generateKeyBetween(prev ?? null, next ?? null);
}

export function keyAfter(last?: string | null): string {
  return keyBetween(last, null);
}

export function needsRenormalize(key: string): boolean {
  return key.length > MAX_KEY_LENGTH;
}

export function evenKeys(count: number): string[] {
  return generateNKeysBetween(null, null, count);
}

// fractional index 는 로케일 비교가 아닌 코드 포인트 순서로 정렬해야 한다
export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

import type { Member } from "@/types/ui";
import { initialsOf } from "@/lib/format";

function member(id: string, name: string, role: Member["role"]): Member {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@group37.dev`,
    initials: initialsOf(name),
    role,
  };
}

export const MEMBERS: Member[] = [
  member("member-phalguni", "Phalguni M", "admin"),
  member("member-vismaya", "Vismaya R", "editor"),
  member("member-namana", "Namana K", "editor"),
  member("member-purva", "Purva S", "editor"),
];

export const MEMBER_BY_ID: Record<string, Member> = Object.fromEntries(
  MEMBERS.map((m) => [m.id, m]),
);

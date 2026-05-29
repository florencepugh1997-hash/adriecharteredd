import { User } from "../types.js";

interface UserAvatarProps {
  user: Pick<User, "fullName" | "profilePhoto">;
  className?: string;
  textClassName?: string;
}

export default function UserAvatar({ user, className = "w-10 h-10", textClassName = "text-xs" }: UserAvatarProps) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (user.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt={user.fullName}
        className={`${className} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-[#4A90D9] flex items-center justify-center text-white font-bold ${textClassName} border-2 border-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

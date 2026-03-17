"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AccountPage() {
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div>
      <h1 className="heading-display text-2xl text-dark-gray">My Account</h1>
      <p className="mt-1 text-sm text-body-gray">
        Manage your profile and preferences.
      </p>

      <div className="mt-6 rounded-md border border-border-warm bg-cream p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={session?.user?.image ?? undefined}
              alt={session?.user?.name ?? "User"}
            />
            <AvatarFallback className="bg-navy text-white text-lg font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-dark-gray">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-sm text-body-gray">
              {session?.user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

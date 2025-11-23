"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PresenceIndicatorProps {
    questionId?: Id<"questions">;
}

export function PresenceIndicator({ questionId }: PresenceIndicatorProps) {
    const onlineMembers = useQuery(api.presence.getOnlineTeamMembers, { questionId });

    if (!onlineMembers || onlineMembers.length === 0) {
        return null;
    }

    const others = onlineMembers.filter((m) => !m.isMe);
    const me = onlineMembers.find((m) => m.isMe);

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="w-4 h-4 text-gray-600" />
            <div className="flex items-center gap-1">
                <AnimatePresence>
                    {me && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="relative"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(me.name)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        </motion.div>
                    )}
                    {others.map((member) => (
                        <motion.div
                            key={member.userId}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="relative"
                            title={member.name}
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(member.name)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <span className="text-sm text-gray-600">
                {onlineMembers.length} online
            </span>
        </div>
    );
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

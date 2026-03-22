"use client";
import Image from "next/image";
import Link from "next/link";
import type { SocialAccount } from "@prisma/client";

interface PageCardProps {
  page: SocialAccount;
}

export function PageCard({ page }: PageCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 hover:shadow-md transition">
      <div className="flex items-center gap-3 mb-4">
        {page.igProfilePicUrl ? (
          <Image src={page.igProfilePicUrl} alt="" width={40} height={40} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
            {page.platformUsername?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">@{page.platformUsername}</p>
          {page.displayLabel && <p className="text-xs text-gray-500">{page.displayLabel}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
        <span>{page.followerCount.toLocaleString()} followers</span>
        {page.niche && <span>Niche: {page.niche}</span>}
        <span>{Number(page.engagementRate).toFixed(1)}% engagement</span>
        <span>{page.activeCampaigns} active campaigns</span>
        <span>Earned: €{(page.totalEarnings / 100).toFixed(2)}</span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Link
          href={`/pages/${page.id}`}
          className="flex-1 text-center text-sm text-blue-600 hover:underline"
        >
          View Details
        </Link>
        <Link
          href={`/pages/${page.id}?edit=1`}
          className="flex-1 text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

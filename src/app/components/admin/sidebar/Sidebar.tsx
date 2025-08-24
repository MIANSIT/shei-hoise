"use client";

import { sideMenu } from "@/lib/menu";
import SidebarItem from "./SidebarItem";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-black dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <nav className="p-2 space-y-1">
        {sideMenu.map((menu) => (
          <SidebarItem key={menu.title} item={menu} />
        ))}
      </nav>
    </aside>
  );
}

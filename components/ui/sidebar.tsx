"use client";

import { FC } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Mobile Sidebar (Professional UI)
const Sidebar: FC = () => {
  return (
    <Sheet>
      {/* Mobile Trigger Button */}
      <SheetTrigger asChild>
        <Button
          className="md:hidden bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          variant="default"
        >
          Menü
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-72 p-8 border-r border-gray-200 shadow-xl bg-white"
      >
        <SheetHeader>
          <SheetTitle className="text-3xl font-bold tracking-tight">Menü</SheetTitle>
        </SheetHeader>

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-5 mt-10 text-lg font-medium">
          {[{
            href: "#hero",
            label: "Home"
          },{
            href: "#menu",
            label: "Menu"
          },{
            href: "#ai",
            label: "Empfehlungen"
          },{
            href: "#videos",
            label: "Videos"
          },{
            href: "#contact",
            label: "Kontakt"
          }].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;

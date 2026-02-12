import React, { createContext, useContext, useState } from "react";

interface MenuContextType {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <MenuContext.Provider value={{ selectedIndex, setSelectedIndex }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenuContext() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenuContext must be used within MenuProvider");
  }
  return context;
}

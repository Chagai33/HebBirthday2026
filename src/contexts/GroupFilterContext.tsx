import { createContext, useContext, useState, ReactNode } from 'react';

interface GroupFilterContextType {
  selectedGroupIds: string[];
  setSelectedGroupIds: (ids: string[]) => void;
  toggleGroupFilter: (groupId: string) => void;
  clearGroupFilters: () => void;
}

const GroupFilterContext = createContext<GroupFilterContextType | undefined>(undefined);

export const GroupFilterProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const toggleGroupFilter = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const clearGroupFilters = () => {
    setSelectedGroupIds([]);
  };

  return (
    <GroupFilterContext.Provider
      value={{
        selectedGroupIds,
        setSelectedGroupIds,
        toggleGroupFilter,
        clearGroupFilters,
      }}
    >
      {children}
    </GroupFilterContext.Provider>
  );
};

export const useGroupFilter = () => {
  const context = useContext(GroupFilterContext);
  if (!context) {
    throw new Error('useGroupFilter must be used within GroupFilterProvider');
  }
  return context;
};

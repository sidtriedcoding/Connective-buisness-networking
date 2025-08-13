import { useState, useEffect, createContext, useContext } from "react";

interface PostRefreshContextType {
  refreshPosts: () => void;
  refreshTrigger: number;
}

const PostRefreshContext = createContext<PostRefreshContextType | undefined>(undefined);

export const PostRefreshProvider = ({ children }: { children: React.ReactNode }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPosts = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <PostRefreshContext.Provider value={{ refreshPosts, refreshTrigger }}>
      {children}
    </PostRefreshContext.Provider>
  );
};

export const usePostRefresh = () => {
  const context = useContext(PostRefreshContext);
  if (context === undefined) {
    throw new Error("usePostRefresh must be used within a PostRefreshProvider");
  }
  return context;
};
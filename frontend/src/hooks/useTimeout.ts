import { useEffect } from "react";

const useTimeout = (callback: () => void, delay: number): void => {
  useEffect(() => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  }, [callback, delay]);
};

export default useTimeout;

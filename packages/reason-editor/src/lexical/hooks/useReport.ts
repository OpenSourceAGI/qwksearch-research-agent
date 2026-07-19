/**
 * @fileoverview Custom hook for reporting messages to a temporary on-screen container.
 */
import { useCallback, useEffect, useRef } from "react";

const getElement = (): HTMLElement => {
  let element = document.getElementById("report-container");

  if (element === null) {
    element = document.createElement("div");
    element.id = "report-container";
    element.style.position = "fixed";
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.fontSize = "32px";
    element.style.transform = "translate(-50%, -50px)";
    element.style.padding = "20px";
    element.style.background = "rgba(240, 240, 240, 0.4)";
    element.style.borderRadius = "20px";

    if (document.body) {
      document.body.appendChild(element);
    }
  }

  return element;
};

/**
 * Custom hook that provides a report function to display messages on screen.
 * @returns {(content: string) => ReturnType<typeof setTimeout>} A function that takes a string and displays it for 1 second.
 */
export default function useReport(): (
  arg0: string,
) => ReturnType<typeof setTimeout> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanup = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (document.body) {
      document.body.removeChild(getElement());
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return useCallback(
    (content) => {
      // eslint-disable-next-line no-console
      console.log(content);
      const element = getElement();
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      element.innerHTML = content;
      timer.current = setTimeout(cleanup, 1000);
      return timer.current;
    },
    [cleanup],
  );
}

/**
 * @fileoverview Custom hook for managing a single modal's visibility and content.
 */


import type { JSX } from 'react';

import { useCallback, useMemo, useState } from 'react';
import * as React from 'react';

import Modal from '../ui/Modal';

/**
 * Custom hook that provides a modal component and a function to show it.
 * @returns {[JSX.Element | null, (title: string, showModal: (onClose: () => void) => JSX.Element, closeOnClickOutside?: boolean) => void]}
 * A tuple containing the rendered modal component (or null) and a function to display a modal.
 */
export default function useModal(): [
  JSX.Element | null,
  (
    title: string,
    showModal: (onClose: () => void) => JSX.Element,
    closeOnClickOutside?: boolean,
  ) => void,
] {
  const [modalContent, setModalContent] = useState<null | {
    closeOnClickOutside: boolean;
    content: JSX.Element;
    title: string;
  }>(null);

  const onClose = useCallback(() => {
    setModalContent(null);
  }, []);

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null;
    }
    const { title, content, closeOnClickOutside } = modalContent;
    return (
      <Modal
        onClose={onClose}
        title={title}
        closeOnClickOutside={closeOnClickOutside}>
        {content}
      </Modal>
    );
  }, [modalContent, onClose]);

  const showModal = useCallback(
    (
      title: string,
      // eslint-disable-next-line no-shadow
      getContent: (onClose: () => void) => JSX.Element,
      closeOnClickOutside = false,
    ) => {
      setModalContent({
        closeOnClickOutside,
        content: getContent(onClose),
        title,
      });
    },
    [onClose],
  );

  return [modal, showModal];
}

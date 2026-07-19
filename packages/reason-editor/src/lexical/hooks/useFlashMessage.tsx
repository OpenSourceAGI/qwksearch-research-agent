/**
 * @fileoverview Custom hook for accessing the flash message context.
 */


import {
  type ShowFlashMessage,
  useFlashMessageContext,
} from '../context/FlashMessageContext';

/**
 * Custom hook that provides the `showFlashMessage` function from context.
 * @returns {ShowFlashMessage} The function to display flash messages.
 */
export default function useFlashMessage(): ShowFlashMessage {
  return useFlashMessageContext();
}

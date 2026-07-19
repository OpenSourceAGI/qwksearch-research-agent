import { useState, ReactNode } from 'react';
import ColorPicker from './ColorPicker';
import DropDown from './DropDown';

type Props = {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  title?: string;
  stopCloseOnClickSelf?: boolean;
  color: string;
  onChange?: (
    color: string,
    skipHistoryStack: boolean,
    skipRefocus: boolean,
  ) => void;
  tooltip?: string;
  children?: ReactNode;
};

/**
 * A dropdown component that renders a ColorPicker.
 */
export default function DropdownColorPicker({
  disabled = false,
  stopCloseOnClickSelf = true,
  color,
  onChange,
  tooltip,
  children,
  ...rest
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (
    newColor: string,
    skipHistoryStack: boolean,
    skipRefocus: boolean,
  ) => {
    if (onChange) {
      onChange(newColor, skipHistoryStack, skipRefocus);
    }
    // Keep dropdown open after color selection
  };

  return (
    <DropDown
      {...rest}
      disabled={disabled}
      stopCloseOnClickSelf={stopCloseOnClickSelf}
      tooltip={tooltip}
      open={isOpen}
      onOpenChange={setIsOpen}>
      <div
        className='bg-transparent p-2'
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}>
        {children}
        <ColorPicker color={color} onChange={handleColorChange} />
      </div>
    </DropDown>
  );
}

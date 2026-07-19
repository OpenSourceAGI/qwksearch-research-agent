
import type { JSX, Ref, RefObject } from 'react';

import './EquationEditor.css';

import { isHTMLElement } from 'lexical';
import { ChangeEvent, forwardRef } from 'react';

type BaseEquationEditorProps = {
  equation: string;
  inline: boolean;
  setEquation: (equation: string) => void;
};

/**
 * Component for editing LaTeX equations, both inline and block-level.
 */
function EquationEditor(
  { equation, setEquation, inline }: BaseEquationEditorProps,
  forwardedRef: Ref<HTMLInputElement | HTMLTextAreaElement>,
): JSX.Element {
  const onChange = (event: ChangeEvent) => {
    setEquation((event.target as HTMLInputElement).value);
  };

  return inline && isHTMLElement(forwardedRef) ? (
    <span className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">$</span>
      <input
        className="EquationEditor_inlineEditor"
        value={equation}
        onChange={onChange}
        autoFocus={true}
        ref={forwardedRef as RefObject<HTMLInputElement>}
      />
      <span className="EquationEditor_dollarSign">$</span>
    </span>
  ) : (
    <div className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">{'$$\n'}</span>
      <textarea
        className="EquationEditor_blockEditor"
        value={equation}
        onChange={onChange}
        ref={forwardedRef as RefObject<HTMLTextAreaElement>}
      />
      <span className="EquationEditor_dollarSign">{'\n$$'}</span>
    </div>
  );
}

export default forwardRef(EquationEditor);

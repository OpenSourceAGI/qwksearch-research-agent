import { bridge } from "./useExtensionMessages";

export default function SignInView() {
  return (
    <div className="sign-in">
      <h3>Sign in to QwkSearch</h3>
      <p>
        Connect your QwkSearch account to search the web, ask research questions, and get
        cited answers without leaving VS Code.
      </p>
      <button className="primary-button" onClick={() => bridge.post({ type: "login" })}>
        Sign In
      </button>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useState, type ChangeEvent } from "react";
import { useOnboarding } from "../context/OnboardingContext";

export default function ConnectAwsPage() {
  const { state, setAwsConnected } = useOnboarding();

  const [clientKey, setClientKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  
  const handleClientKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setClientKey(e.target.value);
  }

  const handleSecretKeyChange = (e : ChangeEvent<HTMLInputElement>) => {
    setSecretKey(e.target.value);
  }

  const handleSubmit = () => {
    const payload = {
      clientKey,
      secretKey,
    };
    console.log(payload);
    // TODO: Send credentials to the API using fetch
    setAwsConnected(true);
  }


  return (
    <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
      <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
        Connect AWS
      </h2>

      <p className="text-sm text-(--text-secondary) font-light leading-relaxed">
        Connect to your AWS account by setting up an IAM role to allow AppLens access to your app. Then, enter the client key and secret key for IAM role below. 
      </p>

      <form id="connect-aws-form">
        <label>
          Client Key
          <input name="client_key" onChange={handleClientKeyChange} value={clientKey} />
        </label>
        <label>
          Secret Key
          <input name="secret_key" onChange={handleSecretKeyChange} value={secretKey} />
        </label>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          Mark AWS Connected (demo)
        </button>

        <Link
          to="/onboarding/set-context"
          className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
        >
          Continue
        </Link>
      </div>

      {state.awsConnected && (
        <p className="mt-6 text-sm text-(--text-primary)">✅ AWS connected (demo state)</p>
      )}
    </div>
  );
}

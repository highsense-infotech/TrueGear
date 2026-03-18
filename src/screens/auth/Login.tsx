import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { login as loginApi } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";
import imgBg from "../../assets/login_bg.png";
import { EyeOffIcon, EyeIcon, Loader2 } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { GoogleIcon } from "../../assets/GoogleIcon";

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  "super-admin": ROUTES.APPOINTMENT_DASHBOARD,
  "security-gate-keeper": ROUTES.SECURITY_DASHBOARD,
  "qc-inspector": ROUTES.QUALITY_CHECK_DASHBOARD,
  "customer": ROUTES.SERVICE_ADVISOR_DASHBOARD,
};

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(email, password);

      if (res.status && res.data) {
        login({ token: res.data.token, user: res.data.user });

        const roleSlug = res.data.user.role?.slug;
        const defaultRoute = ROLE_DEFAULT_ROUTES[roleSlug] || ROUTES.HOME;
        navigate(defaultRoute, { replace: true });
      } else {
        setError(res.message || "Login failed");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#02338E] font-['Poppins']">
      {/* Background Image */}
      <img
        src={imgBg}
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-[#02338E]/80 via-transparent to-[#02338E]/80 pointer-events-none mix-blend-multiply" />

      {/* Radial glow for center highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 gap-6 sm:gap-8">
        {/* Title */}
        <h1 className="text-center font-['Playfair_Display'] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-transparent bg-clip-text bg-linear-to-b from-white to-[#d0d0d0] drop-shadow-lg px-2">
          TrueGear
        </h1>

        {/* Glass Card */}
        <div className="w-full max-w-[320px] sm:max-w-100 md:max-w-120 lg:max-w-136.25 rounded-2xl sm:rounded-[20px] border border-white/20 bg-white/10 backdrop-blur-xl p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl mx-2 sm:mx-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-white">
            <h2 className="mb-2 text-2xl sm:text-3xl md:text-[40px] font-semibold leading-tight">
              Welcome back!
            </h2>
            <p className="text-sm sm:text-base font-normal opacity-90">
              Login to access all your data
            </p>
          </div>
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/30 text-white text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="Enter your email address"
              className="w-full h-12 sm:h-16 px-4 sm:px-5 py-2 border border-gray-200 rounded-[20px] text-sm sm:text-base font-medium"
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Enter your password"
              className="w-full h-12 sm:h-16 px-4 sm:px-5 py-2 border border-gray-200 rounded-[20px] text-sm sm:text-base font-medium"
              rightIcon={
                showPassword ? (
                  <EyeIcon
                    className="h-5 w-5 sm:h-6 sm:w-6 text-white hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <EyeOffIcon
                    className="h-5 w-5 sm:h-6 sm:w-6 text-white hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => setShowPassword(true)}
                  />
                )
              }
            />

            <Button
              type="submit"
              variant="custom"
              disabled={loading}
              className="w-full mt-4 sm:mt-4 md:mt-6 shadow-lg hover:shadow-orange-500/20 bg-[#FF5100] text-white rounded-[20px] hover:bg-[#FF5100]/90 border-none h-12 sm:h-14 md:h-16"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-5 sm:my-6 flex items-center justify-between gap-4 sm:gap-6">
            <div className="h-[1.5px] w-full bg-white/80" />
            <span className="whitespace-nowrap text-sm sm:text-base md:text-[18px] font-medium text-white">
              Continue with
            </span>
            <div className="h-[1.5px] w-full bg-white/80" />
          </div>

          {/* Social Login */}
          <Button variant="outline" className="w-full text-white hover:text-black gap-3 sm:gap-4 h-12 sm:h-14 md:h-16 rounded-[20px]">
            <span className="text-sm sm:text-base font-medium">Login with Google</span>
            <GoogleIcon className="h-7 w-7" />
          </Button>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-white tracking-[0.08px]">
            <span className="opacity-90">Don't have an account?</span>{" "}
            <a
              href="#"
              className="font-semibold underline decoration-solid underline-offset-4 hover:text-white/80 transition-colors"
            >
              Register
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

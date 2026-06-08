import { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import "./RoleLogin.css";

import LogoSBB from "../../../assets/LogoSBB.png";
import LoginBoy from "../../../assets/login_boy.png";
import AdminBoy from "../../../assets/admin_boy.png";

const roleConfig = {
  orangtua: {
    key: "orangtua",
    label: "Orang Tua",
    title: "Login Orang Tua",
    shapeColor: "#4d7f80",
    accentColor: "#6e9f49",
    helper: "Pantau perkembangan latihan anak dan informasi akademi.",
    image: LoginBoy,
    showCoachBadges: false,
  },
  pelatih: {
    key: "pelatih",
    label: "Pelatih",
    title: "Login Pelatih",
    shapeColor: "#5db8bc",
    accentColor: "#2c8e8c",
    helper: "Kelola jadwal latihan, absensi pemain, dan evaluasi tim.",
    image: LoginBoy,
  },
  admin: {
    key: "admin",
    label: "Admin",
    title: "Login Admin",
    shapeColor: "#4d7f80",
    accentColor: "#49665b",
    helper: "Kelola konten website, user role, dan data sistem.",
    image: AdminBoy,
  },
};

const roleOptions = [roleConfig.orangtua, roleConfig.pelatih, roleConfig.admin];

const roleChoiceImageStyle = (accentColor) => ({
  display: "block",
  height: "128px",
  margin: "0 0 18px",
  borderRadius: "10px",
  background: `linear-gradient(135deg, ${accentColor || "#6e9f49"}, #e6efe1)`,
  overflow: "hidden",
});

export default function RoleLogin({
  role,
  onBack,
  onChangeRole,
  onOpenResetPassword,
  onLoginSuccess,
}) {
  const { errors = {}, flash = {} } = usePage().props;
  const [selectedRoleKey, setSelectedRoleKey] = useState(role || "");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentRole = useMemo(
    () => roleConfig[selectedRoleKey] || roleConfig.orangtua,
    [selectedRoleKey]
  );
  const isChoosingRole = !selectedRoleKey;
  const formError = loginError || errors.email || errors.password;
  const successMessage = flash.success && !formError ? flash.success : "";

  const resetLoginFields = () => {
    setEmail("");
    setPassword("");
    setLoginError("");
    setShowPassword(false);
  };

  const selectRole = (nextRoleKey) => {
    if (!onChangeRole && !role) {
      router.visit(`/login/${nextRoleKey}`);
      return;
    }

    setSelectedRoleKey(nextRoleKey);
    resetLoginFields();
  };

  const handleBack = () => {
    if (isChoosingRole) {
      if (onBack) {
        onBack();
        return;
      }

      router.visit("/");
      return;
    }

    if (role) {
      if (onBack) {
        onBack();
        return;
      }

      router.visit("/login");
      return;
    }

    setSelectedRoleKey("");
    resetLoginFields();
  };

  const handleChangeRole = () => {
    if (role) {
      if (onChangeRole) {
        onChangeRole();
        return;
      }

      router.visit("/login");
      return;
    }

    setSelectedRoleKey("");
    resetLoginFields();
  };

  const openResetPassword = () => {
    if (onOpenResetPassword) {
      onOpenResetPassword(currentRole.key, email);
      return;
    }

    router.visit(`/password/forgot${email ? `?email=${encodeURIComponent(email)}` : ""}`);
  };

  const handleLoginSuccess = (payload) => {
    if (onLoginSuccess) {
      onLoginSuccess(currentRole, payload);
      return;
    }

    if (currentRole.key === "admin") {
      router.visit("/admin/dashboard");
      return;
    }

    if (currentRole.key === "orangtua") {
      router.visit("/orang-tua/dashboard");
      return;
    }

    if (currentRole.key === "pelatih") {
      router.visit("/pelatih/dashboard");
      return;
    }

    setLoginError(`Login ${currentRole.label} berhasil.`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setLoginError("Email dan kata kunci wajib diisi.");
      return;
    }

    if (onLoginSuccess) {
      handleLoginSuccess({ email: normalizedEmail });
      return;
    }

    setLoginError("");
    router.post("/api/login", {
      email: normalizedEmail,
      password,
      role: currentRole.key === "orangtua" ? "orang_tua" : currentRole.key,
    }, {
      preserveScroll: true,
      onStart: () => setIsSubmitting(true),
      onFinish: () => setIsSubmitting(false),
      onError: (nextErrors) => {
        setPassword("");
        setLoginError(nextErrors.email || nextErrors.password || nextErrors.role || "Email, kata kunci, atau role tidak sesuai.");
      },
    });
  };

  if (isChoosingRole) {
    return (
      <>
        <Head title="Pilih Login" />
        <div className="roleLoginPage roleChoicePage">
          <main className="roleChoiceShell">
            <section className="roleChoiceHero">
              <div className="roleChoiceBrand">
                <img src={LogoSBB} alt="Logo SSB" />
                <span>SSB Rumbai Pratama</span>
              </div>
              <h1>Pilih Role Login</h1>
              <p>Masuk sesuai peran akun untuk membuka akses yang tepat.</p>
            </section>

            <section className="roleChoiceGrid" aria-label="Pilihan role login">
              {roleOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="roleChoiceCard"
                  style={{ "--role-accent": item.accentColor }}
                  onClick={() => selectRole(item.key)}
                >
                  <span
                    className="roleChoiceImage"
                    style={roleChoiceImageStyle(item.accentColor)}
                  >
                    <img src={item.image} alt="" />
                  </span>
                  <span className="roleChoiceLabel">{item.label}</span>
                  <span className="roleChoiceText">{item.helper}</span>
                </button>
              ))}
            </section>

            <button type="button" className="roleChoiceBackBtn" onClick={handleBack}>
              Back
            </button>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
    <Head title={currentRole.title} />
    <div className="roleLoginPage">
      <main className="roleLoginShell">
        <div className="roleLoginMain">
          <section
            className="roleLoginLeft"
            style={{ "--shape-color": currentRole.shapeColor }}
            aria-hidden="true"
          >
            <div className="roleLoginShape" />
            <img className="roleLoginLogo" src={LogoSBB} alt="Logo SSB" />
            <img className="roleLoginBoy" src={currentRole.image} alt="Pemain sepak bola" />
          </section>

          <section className="roleLoginRight">
            <form className="roleLoginForm" onSubmit={handleSubmit}>
              <h1>{currentRole.title}</h1>
              <p>{currentRole.helper}</p>

              <label htmlFor="role-login-email">Email</label>
              <input
                id="role-login-email"
                type="email"
                placeholder="Masukkan Email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (loginError) setLoginError("");
                }}
              />

              <label htmlFor="role-login-password">Kata Kunci</label>
              <div className="roleLoginPasswordWrap">
                <input
                  id="role-login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Kata Kunci"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (loginError) setLoginError("");
                  }}
                />
                <button
                  type="button"
                  className="roleLoginPasswordToggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan kata kunci" : "Tampilkan kata kunci"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                className="roleLoginResetBtn"
                onClick={openResetPassword}
              >
                Lupa Kata Kunci?
              </button>

              <div className="roleLoginActions">
                <button type="button" className="roleLoginGhostBtn" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="roleLoginGhostBtn" onClick={handleChangeRole}>
                  Ganti Role
                </button>
                <button
                  type="submit"
                  className="roleLoginSubmitBtn"
                  style={{ "--btn-accent": currentRole.accentColor }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Masuk..." : "Login"}
                </button>
              </div>
              {successMessage && <p className="roleLoginSuccess">{successMessage}</p>}
              {formError && <p className="roleLoginError">{formError}</p>}
            </form>
          </section>
        </div>
      </main>
    </div>
    </>
  );
}

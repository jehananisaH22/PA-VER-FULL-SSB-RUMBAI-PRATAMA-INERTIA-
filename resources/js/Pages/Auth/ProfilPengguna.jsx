import "./ProfilPengguna.css"; 
import { Head, router } from "@inertiajs/react"; 
import { useState } from "react"; 

import LogoSBB from "../../../assets/LogoSBB.png"; 
import ProfileIcon from "../../../assets/Profile.png"; 

const statusLabels = { 
  paid: "Lunas", 
  unpaid: "Belum Lunas", 
  valid: "Valid", 
  pending: "Menunggu", 
  invalid: "Tidak Valid"
}; 

export default function ProfilPengguna({ 
  profile, 
  onOpenHome, 
  onOpenDashboard, 
  onOpenResetPassword, 
  onLogout
}) {
  const children = profile?.children || []; 
  const [childDetails, setChildDetails] = useState(profile?.childDetails || []); 
  const [savingChildId, setSavingChildId] = useState(null); 
  const [childMessages, setChildMessages] = useState({}); 
  const [childErrors, setChildErrors] = useState({}); 
  const details = profile?.details || []; 
  const sections = profile?.sections || []; 
  const isParent = profile?.roleKey === "orangtua"; 
  const initials = (profile?.name || profile?.roleLabel || "User").
  split(/\s+/).
  filter(Boolean).
  slice(0, 2).
  map((item) => item[0]?.toUpperCase()).
  join(""); 
  const openHome = () => onOpenHome ? onOpenHome() : router.visit("/"); 
  const openDashboard = () =>
  onOpenDashboard ? onOpenDashboard() : router.visit(profile?.dashboardUrl || "/"); 
  const openResetPassword = () =>
  onOpenResetPassword ? onOpenResetPassword() : router.visit("/password/reset"); 
  const logout = () => onLogout ? onLogout() : router.visit("/login"); 

  const updateChildProfileField = (childId, field, value) => {
    setChildDetails((current) =>
    current.map((child) =>
    child.id === childId ?
    {
      ...child, 
      editableProfile: {
        ...(child.editableProfile || {}), 
        [field]: value
      }
    } :
    child
    )
    ); 
    setChildErrors((current) => ({ ...current, [childId]: { ...(current[childId] || {}), [field]: null } })); 
    setChildMessages((current) => ({ ...current, [childId]: "" }));
  }; 

  const syncChildReadOnlyItems = (child, nextValues) => ({
    ...child, 
    items: (child.items || []).map((item) => {
      if (item.label === "Alamat") return { ...item, value: nextValues.alamat || "-" }; 
      if (item.label === "Tinggi Badan") {
        return { ...item, value: nextValues.tinggi_badan ? `${nextValues.tinggi_badan} cm` : "-" };
      } 
      if (item.label === "Berat Badan") {
        return { ...item, value: nextValues.berat_badan ? `${nextValues.berat_badan} kg` : "-" };
      } 
      return item;
    })
  }); 

  const saveChildProfile = async (child) => {
    const values = child.editableProfile || {}; 
    setSavingChildId(child.id); 
    setChildMessages((current) => ({ ...current, [child.id]: "" })); 
    setChildErrors((current) => ({ ...current, [child.id]: {} })); 

    try {
      await window.axios.post(`/api/siswa/profil/${child.id}`, { 
        alamat: values.alamat || "", 
        tinggi_badan: values.tinggi_badan || "", 
        berat_badan: values.berat_badan || ""
      }); 

      setChildDetails((current) =>
      current.map((item) => item.id === child.id ? syncChildReadOnlyItems(item, values) : item)
      ); 
      setChildMessages((current) => ({ ...current, [child.id]: "Data siswa berhasil diperbarui." }));
    } catch (error) {
      setChildErrors((current) => ({ ...current, [child.id]: error?.response?.data?.errors || {} })); 
      setChildMessages((current) => ({
        ...current, 
        [child.id]: error?.response?.data?.message || "Data siswa belum bisa disimpan."
      }));
    } finally {
      setSavingChildId(null);
    }
  }; 

  return (
    <div className="userProfilePage">
       <Head title="Profil Pengguna" />
       <header className="userProfileHeader">
         <button type="button" className="userProfileBrand" onClick={openHome}>
           <img src={LogoSBB} alt="Logo SSB" />
           <span>SSB Rumbai Pratama</span>
        </button>
         <button
          type="button"
          className="userProfileCloseBtn"
          onClick={openDashboard}
          aria-label="Kembali ke dashboard">
          
          X
        </button>
      </header>

       <main className="userProfileMain">
         <section className="userProfileHero">
           <div className="userProfileAvatar">
            {initials || <img src={ProfileIcon} alt="" />}
          </div>
           <div>
             <p>{profile?.roleLabel || "Akun"}</p>
             <h1>{profile?.name || "Pengguna"}</h1>
             <span>{profile?.email || "-"}</span>
          </div>
        </section>

         <section className="userProfileGrid">
           <article className="userProfileCard">
             <h2>Informasi Akun</h2>
             <dl>
               <div>
                 <dt>Role</dt>
                 <dd>{profile?.roleLabel || "-"}</dd>
              </div>
               <div>
                 <dt>Email</dt>
                 <dd>{profile?.email || "-"}</dd>
              </div>
               <div>
                 <dt>No Handphone</dt>
                 <dd>{profile?.phone || "-"}</dd>
              </div>
               <div>
                 <dt>Status Akun</dt>
                 <dd>{profile?.accountStatus || "Aktif"}</dd>
              </div>
              {details.map((item) => (
              <div key={item.label}>
                   <dt>{item.label}</dt>
                   <dd>{item.value || "-"}</dd>
                </div>)
              )}
            </dl>
          </article>

          {isParent ? (
          <article className="userProfileCard">
               <h2>Data Siswa</h2>
               <div className="userProfileChildren">
                {children.length > 0 ?
              children.map((childName) => <span key={childName}>{childName}</span>) : (

              <span>-</span>)
              }
              </div>
              {childDetails.length > 0 && (
            <div className="userProfileStudentDetails">
                  {childDetails.map((child) => (
              <div className="userProfileStudentDetail" key={child.id || child.name}>
                       <strong>{child.name}</strong>
                       <dl>
                        {(child.items || []).map((item) => (
                  <div key={`${child.name}-${item.label}`}>
                             <dt>{item.label}</dt>
                             <dd>{item.value || "-"}</dd>
                          </div>)
                  )}
                      </dl>
                      {child.id && (
                <div className="userProfileStudentEdit">
                           <label>
                            Alamat
                             <textarea
                      rows={3}
                      value={child.editableProfile?.alamat || ""}
                      onChange={(event) => updateChildProfileField(child.id, "alamat", event.target.value)} />
                    
                            {childErrors[child.id]?.alamat && <small>{childErrors[child.id].alamat[0]}</small>}
                          </label>
                           <label>
                            Tinggi Badan
                             <input
                      type="number"
                      value={child.editableProfile?.tinggi_badan || ""}
                      onChange={(event) => updateChildProfileField(child.id, "tinggi_badan", event.target.value)}
                      placeholder="cm" />
                    
                            {childErrors[child.id]?.tinggi_badan && <small>{childErrors[child.id].tinggi_badan[0]}</small>}
                          </label>
                           <label>
                            Berat Badan
                             <input
                      type="number"
                      value={child.editableProfile?.berat_badan || ""}
                      onChange={(event) => updateChildProfileField(child.id, "berat_badan", event.target.value)}
                      placeholder="kg" />
                    
                            {childErrors[child.id]?.berat_badan && <small>{childErrors[child.id].berat_badan[0]}</small>}
                          </label>
                          {childMessages[child.id] && (
                  <p className={`userProfileStudentMessage ${Object.keys(childErrors[child.id] || {}).length ? "isError" : ""}`}>
                              {childMessages[child.id]}
                            </p>)
                  }
                           <button
                    type="button"
                    className="userProfileStudentSave"
                    onClick={() => saveChildProfile(child)}
                    disabled={savingChildId === child.id}>
                    
                            {savingChildId === child.id ? "Menyimpan..." : "Simpan Data Siswa"}
                          </button>
                        </div>)
                }
                    </div>)
              )}
                </div>)
            }
               <dl className="userProfileStatusList">
                 <div>
                   <dt>Pembayaran</dt>
                   <dd>{statusLabels[profile?.paymentStatus] || profile?.paymentStatus || "-"}</dd>
                </div>
                 <div>
                   <dt>Bukti Pembayaran</dt>
                   <dd>
                    {statusLabels[profile?.paymentProofStatus] ||
                  profile?.paymentProofStatus ||
                  "-"}
                  </dd>
                </div>
                 <div>
                   <dt>Validasi</dt>
                   <dd>
                    {statusLabels[profile?.validationStatus] || profile?.validationStatus || "-"}
                  </dd>
                </div>
              </dl>
            </article>) : (

          <article className="userProfileCard userProfileSummaryCard">
               <h2>Akses Sistem</h2>
               <p>{profile?.accessSummary || "Akun dapat mengakses panel sesuai role."}</p>
            </article>)
          }

          {sections.map((section) => (
          <article className="userProfileCard" key={section.title}>
               <h2>{section.title}</h2>
               <dl>
                {(section.items || []).map((item) => (
              <div key={item.label}>
                     <dt>{item.label}</dt>
                     <dd>{item.value || "-"}</dd>
                  </div>)
              )}
              </dl>
            </article>)
          )}
        </section>

         <section className="userProfileActions">
           <button type="button" className="userProfilePrimaryBtn" onClick={openResetPassword}>
            Reset Password
          </button>
           <button type="button" className="userProfileDangerBtn" onClick={logout}>
            Logout
          </button>
        </section>
      </main>
    </div>);

}

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, limit, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";
import "./styles.css";

const DEMO_EDITION = { name: "Tombola de Noël 2026", country: "Cameroun", status: "Préparation", ticketPrice: 100, drawDate: "2026-12-25", description: "La magie de Noël, des surprises et de belles émotions à partager. Notre grande édition se prépare !" };
const DEMO_PRIZES = [
  { id: "p1", name: "Une moto neuve", value: "Lot principal", detail: "LE GRAND LOT" },
  { id: "p2", name: "Un téléviseur", value: "Super cadeau", detail: "POUR LA MAISON" },
  { id: "p3", name: "Un smartphone", value: "Cadeau connecté", detail: "RESTEZ CONNECTÉ" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edition, setEdition] = useState(DEMO_EDITION);
  const [prizes, setPrizes] = useState(DEMO_PRIZES);
  const [myEntries, setMyEntries] = useState([]);
  const [view, setView] = useState("home");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);
  useEffect(() => {
    if (!firebaseReady || !db) return;
    getDocs(query(collection(db, "editions"), where("status", "in", ["published", "preparation"]), limit(1)))
      .then(s => { if (!s.empty) setEdition({ ...DEMO_EDITION, ...s.docs[0].data(), id: s.docs[0].id }); }).catch(() => {});
    getDocs(query(collection(db, "prizes"), orderBy("createdAt", "desc"), limit(6)))
      .then(s => { if (!s.empty) setPrizes(s.docs.map(d => ({ id: d.id, ...d.data() }))); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user || !firebaseReady || !db) { setMyEntries([]); return; }
    getDocs(query(collection(db, "participations"), where("uid", "==", user.uid), orderBy("createdAt", "desc"), limit(30)))
      .then(s => setMyEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))).catch(() => setMyEntries([]));
  }, [user]);

  const dateLabel = useMemo(() => {
    if (!edition.drawDate) return "Date à confirmer";
    return new Date(edition.drawDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }, [edition.drawDate]);

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setAuthError("");
    try {
      if (!firebaseReady || !auth || !db) throw new Error("La base Firebase doit encore être reliée pour activer les comptes.");
      if (authMode === "signup") {
        if (password !== confirmPassword) throw new Error("Les deux mots de passe ne correspondent pas.");
        if (name.trim().length < 2) throw new Error("Veuillez saisir votre nom complet.");
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          role: "participant",
          createdAt: serverTimestamp(),
          accountStatus: "active"
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setView("account");
    } catch (err) {
      setAuthError(err.code === "auth/email-already-in-use" ? "Cette adresse possède déjà un compte." :
        err.code === "auth/invalid-credential" ? "Adresse e-mail ou mot de passe incorrect." :
        err.code === "auth/weak-password" ? "Choisissez un mot de passe d'au moins 6 caractères." :
        err.message || "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function logout() { if (auth) await signOut(auth); setView("home"); }
  function requestParticipation() {
    setNotice("Les comptes participants pourront être créés. L'achat de tickets et les paiements seront activés après la signature effective des autorisations et la validation des comptes marchands MTN/Orange Money.");
    setView("auth");
    setAuthMode("signup");
  }

  return <div className="app-shell">
    <div className="top-ribbon">✨ LA GRANDE TOMBOLA DE NOËL ARRIVE AU CAMEROUN ✨</div>
    <header className="topbar">
      <a className="brand" href="#" onClick={e => {e.preventDefault();setView("home");}}><span className="brand-mark">T</span><span>TOMBOLA<small>CAMEROUN</small></span></a>
      <nav><button className={view === "home" ? "nav active" : "nav"} onClick={() => setView("home")}>Accueil</button><button className={view === "rules" ? "nav active" : "nav"} onClick={() => setView("rules")}>Le jeu</button>{user && <button className={view === "account" ? "nav active" : "nav"} onClick={() => setView("account")}>Mon espace</button>}</nav>
      <div className="header-action">{user ? <button className="btn btn-outline compact" onClick={logout}>Déconnexion</button> : <button className="btn btn-dark compact" onClick={() => setView("auth")}>Mon compte</button>}</div>
    </header>

    {view === "home" && <>
      <section className="hero">
        <div className="confetti confetti-a">✦</div><div className="confetti confetti-b">✺</div>
        <div className="hero-copy"><span className="eyebrow"><i/> ÉDITION SPÉCIALE · NOËL 2026</span><h1>La fête, les surprises<br/>et <em>la chance !</em></h1><p>{edition.description}</p><div className="hero-meta"><div><small>GRAND TIRAGE</small><strong>{dateLabel}</strong></div><div><small>AU CAMEROUN</small><strong>Une fête pour tous</strong></div></div><button className="btn btn-primary" onClick={requestParticipation}>Créer mon compte <span>🎉</span></button><p className="micro">Inscription au compte participant · Paiement bientôt disponible après autorisations.</p></div>
        <div className="hero-art"><div className="glow-disc"/><div className="gift gift-one">🎁</div><div className="gift gift-two">🎊</div><div className="ticket ticket-back"><span>GRANDE TOMBOLA</span><b>NOËL 2026</b><small>CAMEROUN · ✨</small></div><div className="ticket ticket-front"><span>VOTRE CHANCE COMMENCE ICI</span><strong>Bonne chance !</strong><small>JOIE · SURPRISES · CADEAUX</small><div className="ticket-seal">T</div></div><div className="spark spark-one">✳</div><div className="spark spark-two">✦</div><div className="art-caption">LA MAGIE DES FÊTES<br/>SE PARTAGE ENSEMBLE</div></div>
      </section>
      {notice && <div className="notice"><span>ℹ</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <section className="section prizes-section"><div className="section-heading"><div><span className="eyebrow">🎁 LES SURPRISES À DÉCOUVRIR</span><h2>Des cadeaux qui font plaisir !</h2></div><span className="muted">Lots prévisionnels · sous réserve de validation</span></div><div className="prize-grid">{prizes.map((p,i)=><article className="prize-card" key={p.id}><div className={"prize-visual visual-"+i}><span>{["🏆","📺","📱"][i] || "🎁"}</span><div className="prize-number">LOT {String(i+1).padStart(2,"0")}</div><div className="prize-confetti">✦　✺　✧</div></div><div className="prize-info"><small>{p.detail || "SURPRISE"}</small><h3>{p.name}</h3><p>{p.value || "Valeur à confirmer"}</p></div></article>)}</div></section>
      <section className="how-section"><div><span className="eyebrow">🥳 C'EST SIMPLE !</span><h2>La joie de jouer,<br/><em>en toute confiance.</em></h2></div><div className="steps"><div><b>01</b><h3>Créer un compte</h3><p>Inscrivez-vous en quelques instants et retrouvez votre espace personnel.</p></div><div><b>02</b><h3>Participer</h3><p>Lorsque l'édition sera officiellement ouverte, choisissez vos tickets et payez par un canal autorisé.</p></div><div><b>03</b><h3>Vivre le tirage</h3><p>Retrouvez vos codes confirmés et suivez la publication officielle des résultats.</p></div></div></section>
    </>}

    {view === "rules" && <main className="content-page"><span className="eyebrow">📜 INFORMATIONS & TRANSPARENCE</span><h1>Jouons dans la confiance.</h1><div className="legal-card"><h3>Édition Noël 2026 — préparation</h3><p>La plateforme prépare l'ouverture de la tombola au Cameroun. La création d'un compte participant est distincte de l'achat d'une participation.</p><p>Les participations payantes, les encaissements Mobile Money et les tirages réels seront activés après la signature effective des autorisations applicables, la validation du règlement et la mise en place des garanties exigées.</p><p>Les lots, leurs valeurs, les dates, les conditions de participation et les modalités de réclamation seront publiés dans le règlement officiel avant l'ouverture des ventes.</p></div></main>}

    {view === "auth" && <main className="auth-wrap"><form className="auth-card" onSubmit={submitAuth}><span className="eyebrow">🎟️ VOTRE ESPACE TOMBOLA</span><h1>{authMode === "login" ? "Heureux de vous revoir !" : "Rejoignez la fête !"}</h1><p>Créez votre compte pour retrouver vos informations et, à l'ouverture officielle, vos participations.</p>{authMode === "signup" && <label>Nom complet<input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom et prénom" autoComplete="name" required/></label>}<label>Adresse e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nom@exemple.com" autoComplete="email"/></label><label>Mot de passe<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 caractères minimum" autoComplete={authMode==="login"?"current-password":"new-password"}/></label>{authMode === "signup" && <label>Confirmer le mot de passe<input type="password" required minLength={6} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Répétez le mot de passe" autoComplete="new-password"/></label>}{authError && <div className="error">{authError}</div>}<button className="btn btn-primary full" disabled={busy}>{busy?"Un instant…":authMode==="login"?"Me connecter":"Créer mon compte 🎉"}</button><button type="button" className="switch-auth" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>{authMode==="login"?"Pas encore de compte ? S'inscrire":"Déjà inscrit ? Se connecter"}</button>{!firebaseReady && <p className="micro">La connexion Firebase doit encore être configurée pour enregistrer les comptes.</p>}</form></main>}

    {view === "account" && <main className="content-page"><span className="eyebrow">🎉 VOTRE ESPACE PERSONNEL</span><h1>Bienvenue{user?.displayName ? ", "+user.displayName : ""} !</h1><p className="muted">{user?.email}</p><div className="legal-card"><h3>Mes participations</h3>{myEntries.length ? myEntries.map(x=><p key={x.id}>Participation · {x.status || "En traitement"} · {x.codes?.join(", ") || "Codes en attente"}</p>) : <p>Votre compte est créé ! Vos participations apparaîtront ici dès l'ouverture officielle de l'édition.</p>}</div><button className="btn btn-outline" onClick={logout}>Me déconnecter</button></main>}

    <footer><div className="footer-brand">TOMBOLA<span>CAMEROUN</span></div><p>✨ De la joie, des surprises et de la transparence.</p><div><button onClick={()=>setView("rules")}>Règlement</button><a href="mailto:contact@tombola.cm">Contact</a></div><small>© 2026 TOMBOLA CAMEROUN · Participations payantes soumises aux autorisations officielles.</small></footer>
  </div>;
}

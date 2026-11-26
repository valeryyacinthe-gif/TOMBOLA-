import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";
import "./styles.css";

const DEMO_EDITION = { name: "Tombola de Noël 2026", country: "Cameroun", status: "Préparation", ticketPrice: 100, drawDate: "2026-12-25", description: "Une édition spéciale à découvrir. Les participations payantes ne seront ouvertes qu'après obtention des autorisations requises." };
const DEMO_PRIZES = [
  { id: "p1", name: "Moto neuve", value: "À confirmer", detail: "Lot principal" },
  { id: "p2", name: "Téléviseur", value: "À confirmer", detail: "Deuxième lot" },
  { id: "p3", name: "Smartphone", value: "À confirmer", detail: "Troisième lot" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!firebaseReady) return;
    getDocs(query(collection(db, "editions"), where("status", "in", ["published", "preparation"]), limit(1)))
      .then(s => { if (!s.empty) setEdition({ ...DEMO_EDITION, ...s.docs[0].data(), id: s.docs[0].id }); }).catch(() => {});
    getDocs(query(collection(db, "prizes"), orderBy("createdAt", "desc"), limit(6)))
      .then(s => { if (!s.empty) setPrizes(s.docs.map(d => ({ id: d.id, ...d.data() }))); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user || !firebaseReady) { setMyEntries([]); return; }
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
      if (!firebaseReady) throw new Error("La connexion Firebase n'est pas encore configurée. Le prototype reste consultable.");
      if (authMode === "signup") await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      setView("account");
    } catch (err) { setAuthError(err.code === "auth/email-already-in-use" ? "Cette adresse possède déjà un compte." : err.code === "auth/invalid-credential" ? "Adresse e-mail ou mot de passe incorrect." : err.message || "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function logout() { await signOut(auth); setView("home"); }
  function requestParticipation() {
    setNotice("Les participations payantes ne sont pas encore ouvertes. Le paiement réel et l'attribution des codes seront activés uniquement après autorisations officielles et intégration marchande sécurisée.");
    setView("home");
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={() => setView("home")}><span className="brand-mark">T</span><span>TOMBOLA<small>CAMEROUN</small></span></a>
      <nav><button className={view === "home" ? "nav active" : "nav"} onClick={() => setView("home")}>Accueil</button><button className={view === "rules" ? "nav active" : "nav"} onClick={() => setView("rules")}>Règlement</button>{user && <button className={view === "account" ? "nav active" : "nav"} onClick={() => setView("account")}>Mon espace</button>}</nav>
      <div className="header-action">{user ? <button className="btn btn-outline compact" onClick={logout}>Déconnexion</button> : <button className="btn btn-dark compact" onClick={() => setView("auth")}>Connexion</button>}</div>
    </header>

    {view === "home" && <>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><i/> ÉDITION SPÉCIALE · CAMEROUN</span><h1>La chance de<br/><em>vivre plus grand.</em></h1><p>{edition.description}</p><div className="hero-meta"><div><small>ÉDITION</small><strong>{edition.name}</strong></div><div><small>TIRAGE ENVISAGÉ</small><strong>{dateLabel}</strong></div></div><button className="btn btn-primary" onClick={requestParticipation}>Participer bientôt <span>↗</span></button><p className="micro">Aucune collecte de fonds n'est actuellement ouverte.</p></div>
        <div className="hero-art"><div className="sun-disc"/><div className="ticket ticket-back">TOMBOLA <b>2026</b></div><div className="ticket ticket-front"><span>VOTRE NUMÉRO</span><strong>00 00 00</strong><small>NOËL · CAMEROUN</small><div className="ticket-seal">T</div></div><div className="spark spark-one">✳</div><div className="spark spark-two">✦</div><div className="art-caption">UNE NOUVELLE ÉDITION<br/>SE PRÉPARE</div></div>
      </section>
      {notice && <div className="notice"><span>ℹ</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <section className="section prizes-section"><div className="section-heading"><div><span className="eyebrow">À REMPORTER</span><h2>Les lots de l'édition</h2></div><span className="muted">Sélection prévisionnelle</span></div><div className="prize-grid">{prizes.map((p,i)=><article className="prize-card" key={p.id}><div className={"prize-visual visual-"+i}><span>{String(i+1).padStart(2,"0")}</span><div className="prize-symbol">{i===0?"✧":i===1?"▣":"◈"}</div></div><div className="prize-info"><small>{p.detail || "LOT"}</small><h3>{p.name}</h3><p>{p.value || "Valeur à confirmer"}</p></div></article>)}</div></section>
      <section className="how-section"><div><span className="eyebrow">SIMPLE & TRANSPARENT</span><h2>Comment ça<br/><em>fonctionnera.</em></h2></div><div className="steps"><div><b>01</b><h3>Créer un compte</h3><p>Inscrivez-vous et retrouvez votre espace participant.</p></div><div><b>02</b><h3>Participer</h3><p>Choisissez vos participations et payez via un canal officiel disponible.</p></div><div><b>03</b><h3>Suivre le tirage</h3><p>Retrouvez vos codes confirmés et consultez les résultats publiés.</p></div></div></section>
    </>}

    {view === "rules" && <main className="content-page"><span className="eyebrow">INFORMATIONS OFFICIELLES</span><h1>Règlement & transparence</h1><div className="legal-card"><h3>Édition en préparation</h3><p>Cette plateforme est actuellement une démonstration technique. Elle ne constitue pas une autorisation d'organiser ou d'exploiter une tombola payante au Cameroun.</p><p>Les inscriptions payantes, encaissements Mobile Money et tirages réels resteront désactivés jusqu'à l'obtention des autorisations administratives applicables, la validation du règlement et la mise en place des garanties exigées.</p><p>Les modalités définitives, les lots, leur valeur, les dates, les conditions de participation et la procédure de réclamation seront publiés dans un règlement approuvé avant toute ouverture.</p></div></main>}

    {view === "auth" && <main className="auth-wrap"><form className="auth-card" onSubmit={submitAuth}><span className="eyebrow">ESPACE PARTICIPANT</span><h1>{authMode === "login" ? "Bon retour." : "Créer un compte."}</h1><p>Accédez à votre espace personnel TOMBOLA.</p>{authMode === "signup" && <label>Nom complet<input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom" autoComplete="name"/></label>}<label>Adresse e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nom@exemple.com" autoComplete="email"/></label><label>Mot de passe<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 caractères minimum" autoComplete={authMode==="login"?"current-password":"new-password"}/></label>{authError && <div className="error">{authError}</div>}<button className="btn btn-primary full" disabled={busy}>{busy?"Veuillez patienter…":authMode==="login"?"Se connecter":"Créer mon compte"}</button><button type="button" className="switch-auth" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>{authMode==="login"?"Pas encore de compte ? Créer un compte":"Déjà inscrit ? Se connecter"}</button>{!firebaseReady && <p className="micro">Mode aperçu : l'authentification sera disponible après configuration Firebase.</p>}</form></main>}

    {view === "account" && <main className="content-page"><span className="eyebrow">VOTRE ESPACE</span><h1>Bonjour{user?.displayName ? ", "+user.displayName : ""}.</h1><p className="muted">{user?.email}</p><div className="legal-card"><h3>Mes participations</h3>{myEntries.length ? myEntries.map(x=><p key={x.id}>Participation · {x.status || "En traitement"} · {x.codes?.join(", ") || "Codes non attribués"}</p>) : <p>Vous n'avez pas encore de participation. Les inscriptions payantes ne sont pas ouvertes.</p>}</div><button className="btn btn-outline" onClick={logout}>Me déconnecter</button></main>}

    <footer><div className="footer-brand">TOMBOLA<span>CAMEROUN</span></div><p>Une plateforme en préparation. Jouer responsablement.</p><div><button onClick={()=>setView("rules")}>Règlement</button><a href="mailto:contact@tombola.cm">Contact</a></div><small>© 2026 TOMBOLA CAMEROUN · Démonstration non ouverte aux participations payantes.</small></footer>
  </div>;
}

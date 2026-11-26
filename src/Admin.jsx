import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const ADMIN_EMAIL = "valeryyacinthe@gmail.com";
const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tombola-admin`;

export default function Admin() {
  const [session,setSession] = useState(null);
  const [email,setEmail] = useState(ADMIN_EMAIL);
  const [sent,setSent] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [entries,setEntries] = useState([]);
  const [stats,setStats] = useState({total:0,pending:0,confirmed:0,rejected:0,paidAmount:0});
  const [ref,setRef] = useState({});
  const [notes,setNotes] = useState({});
  const [filter,setFilter] = useState("all");

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>subscription.unsubscribe();
  },[]);

  async function requestLink(e){
    e.preventDefault(); setBusy(true); setError("");
    if(email.trim().toLowerCase()!==ADMIN_EMAIL){setError("Cette adresse n'est pas autorisée.");setBusy(false);return;}
    const {error:err} = await supabase.auth.signInWithOtp({
      email:ADMIN_EMAIL,
      options:{emailRedirectTo:window.location.origin}
    });
    if(err) setError(err.message); else setSent(true);
    setBusy(false);
  }

  async function callAdmin(action,extra={}){
    if(!session?.access_token) throw new Error("Session expirée. Reconnectez-vous.");
    const response = await fetch(endpoint,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey":import.meta.env.VITE_SUPABASE_ANON_KEY, "Authorization":`Bearer ${session.access_token}` },
      body:JSON.stringify({action,...extra})
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || "Erreur de communication.");
    return data;
  }

  async function load(){
    setBusy(true);setError("");
    try{const data=await callAdmin("list");setEntries(data.entries||[]);setStats(data.stats||stats);}
    catch(e){setError(e.message);}
    setBusy(false);
  }
  useEffect(()=>{if(session) load();},[session]);

  async function confirm(entry){
    const observed=(ref[entry.id]||"").trim();
    if(observed.length<3){setError("Saisissez d'abord la référence réellement reçue dans MTN MoMo.");return;}
    if(!window.confirm("Confirmer ce paiement après l'avoir vérifié dans votre compte MTN ?")) return;
    setBusy(true);setError("");
    try{await callAdmin("confirm",{entry_id:entry.id,observed_reference:observed,note:notes[entry.id]||""});await load();}
    catch(e){setError(e.message);setBusy(false);}
  }
  async function reject(entry){
    if(!window.confirm("Rejeter cette demande ?")) return;
    setBusy(true);setError("");
    try{await callAdmin("reject",{entry_id:entry.id,note:notes[entry.id]||"Paiement non confirmé"});await load();}
    catch(e){setError(e.message);setBusy(false);}
  }

  const visible=entries.filter(x=>filter==="all"||x.status===filter);
  const statusLabel={verification_pending:"À vérifier",confirmed:"Confirmé",rejected:"Rejeté",cancelled:"Annulé"};

  return <main className="inner-page admin-page">
    <span className="eyebrow">ESPACE PRIVÉ</span>
    <h1>Administration</h1>
    {!session ? <form className="participation-form" onSubmit={requestLink}>
      <div className="info-panel"><h3>Connexion sécurisée</h3><p>Un lien de connexion à usage unique sera envoyé à l'adresse administrateur autorisée.</p></div>
      <label>Adresse e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
      {sent&&<div className="notice">Lien envoyé. Ouvrez votre boîte mail et cliquez sur le lien reçu sur cet appareil.</div>}
      {error&&<div className="notice">{error}</div>}
      <button className="gold-button full-button" disabled={busy}>{busy?"Envoi…":"Recevoir mon lien sécurisé"}</button>
    </form> : <>
      <div className="admin-top"><span>Connecté : {session.user.email}</span><button className="text-link" onClick={async()=>{await supabase.auth.signOut();setSession(null);}}>Déconnexion</button></div>
      <div className="admin-stats">
        <div><b>{stats.total}</b><small>Demandes</small></div>
        <div><b>{stats.pending}</b><small>À vérifier</small></div>
        <div><b>{stats.confirmed}</b><small>Confirmées</small></div>
        <div><b>{Number(stats.paidAmount).toLocaleString("fr-FR")} F</b><small>Montant confirmé</small></div>
      </div>
      <div className="admin-toolbar"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Toutes les demandes</option><option value="verification_pending">À vérifier</option><option value="confirmed">Confirmées</option><option value="rejected">Rejetées</option></select><button className="text-link" onClick={load} disabled={busy}>↻ Actualiser</button></div>
      {error&&<div className="notice">{error}</div>}
      {visible.length===0?<div className="info-panel"><p>Aucune demande dans cette catégorie pour le moment.</p></div>:visible.map(entry=><article className="admin-entry" key={entry.id}>
        <div className="admin-entry-head"><b>{entry.full_name}</b><span className={"status-"+entry.status}>{statusLabel[entry.status]||entry.status}</span></div>
        <p>{entry.city} · {entry.locality}</p><p>{entry.phone} {entry.whatsapp_opt_in?"· WhatsApp accepté":""}</p>
        <p><b>{Number(entry.total_amount_xaf).toLocaleString("fr-FR")} FCFA</b> · {entry.quantity} participation(s)</p>
        <small>Demande : {new Date(entry.created_at).toLocaleString("fr-FR")} · Réf. saisie : {entry.transaction_reference||"non renseignée"}</small>
        {entry.ticket_code&&<p className="admin-ticket">Code : <b>{entry.ticket_code}</b></p>}
        {entry.status==="verification_pending"&&<div className="admin-actions">
          <label>Référence réellement visible sur le compte MTN<input value={ref[entry.id]||""} onChange={e=>setRef(o=>({...o,[entry.id]:e.target.value}))} placeholder="Référence MTN reçue"/></label>
          <label>Note interne (facultatif)<input value={notes[entry.id]||""} onChange={e=>setNotes(o=>({...o,[entry.id]:e.target.value}))} placeholder="Observation"/></label>
          <div><button className="gold-button" disabled={busy} onClick={()=>confirm(entry)}>Confirmer le paiement</button><button className="reject-button" disabled={busy} onClick={()=>reject(entry)}>Rejeter</button></div>
        </div>}
      </article>)}
      <p className="fineprint">La confirmation attribue un code uniquement après contrôle manuel du paiement dans le compte destinataire. Les données personnelles sont visibles uniquement dans cet espace administrateur.</p>
    </>}
  </main>;
}

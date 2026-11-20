
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Anvil, Bell, CalendarClock, CalendarDays, Check, ChevronRight,
  CircleHelp, Coins, Crown, Flame, LayoutDashboard, LogIn, Plus, RefreshCw,
  Settings, Shield, Swords, Users, Zap, Clock3, ExternalLink, Sparkles
} from "lucide-react";

type UpdateApi = {
  downloadUpdate: () => Promise<{ ok: boolean; message?: string }>;
  installUpdate: () => void;
  onUpdateAvailable: (callback: (version: string) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateError: (callback: (message: string) => void) => void;
};

declare global {
  interface Window {
    abyslordUpdater?: UpdateApi;
  }
}

type Character = {
  id: number;
  name: string;
  className: string;
  level: number;
  kinahBound: number;
  kinahFree: number;
  abyss: number;
  energy: number;
  extraEnergy: number;
  nightmare: number;
  bought: number;
  crafted: number;
  portraitUrl?: string;
  itemLevel?: string;
  cp?: string;
  region?: string;
  server?: string;
};

const LUDRA_IMAGE = "https://assets.mmoexp.com/images/202611/88f3c86726b4a369b82731ccf33bf6c85aada77d.png";
const DISCORD_INVITE = "https://discord.gg/dJs5vJCg9R";
const SHUGO_JOLENO = "https://shugo.gg/pt-br/character/global/la-triniel/JolenoSUP";

const initialCharacters: Character[] = [
  { id: 1, name: "JolenoSUP", className: "Clérigo", level: 45, kinahBound: 1250000, kinahFree: 840000, abyss: 182500, energy: 420, extraEnergy: 80, nightmare: 8, bought: 2, crafted: 1, itemLevel: "—", cp: "—", region: "LATAM", server: "Triniel" },
  { id: 2, name: "Personagem 2", className: "Mago", level: 45, kinahBound: 930000, kinahFree: 510000, abyss: 143200, energy: 560, extraEnergy: 0, nightmare: 12, bought: 1, crafted: 2, itemLevel: "—", cp: "—" },
  { id: 3, name: "JOI", className: "Não definido", level: 1, kinahBound: 0, kinahFree: 0, abyss: 0, energy: 0, extraEnergy: 0, nightmare: 14, bought: 0, crafted: 0, itemLevel: "—", cp: "—" }
];

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

function brasiliaParts(now: Date) {
  const d = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay()
  };
}

function nextBrasiliaHour(now: Date, every: number, offset: number) {
  const p = brasiliaParts(now);
  const base = Date.UTC(p.year, p.month, p.day, p.hour, 0, 0) + 3 * 60 * 60 * 1000;
  let candidate = base;

  for (let i = 0; i < 30; i++) {
    const local = new Date(candidate - 3 * 60 * 60 * 1000);
    const h = local.getUTCHours();

    if ((h - offset + 24) % every === 0 && candidate > now.getTime()) {
      return candidate;
    }

    candidate += 60 * 60 * 1000;
  }

  return candidate;
}

function countdown(target: number, now: Date) {
  const s = Math.max(0, Math.floor((target - now.getTime()) / 1000));

  return [
    Math.floor(s / 3600),
    Math.floor((s % 3600) / 60),
    s % 60
  ].map(v => String(v).padStart(2, "0")).join(":");
}

function getResetCountdown(weekly: boolean, now: Date) {
  const p = brasiliaParts(now);
  const days = weekly ? (3 - p.weekday + 7) % 7 : 0;

  let target = Date.UTC(p.year, p.month, p.day + days, 4, 0, 0) + 3 * 60 * 60 * 1000;

  if (target <= now.getTime()) {
    target += (weekly ? 7 : 1) * 86400000;
  }

  const seconds = Math.max(0, Math.floor((target - now.getTime()) / 1000));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return weekly
    ? `${d}d ${[h, m, s].map(v => String(v).padStart(2, "0")).join(":")}`
    : [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function App() {
  const [loggedInPreview, setLoggedInPreview] = useState(false);
  const [characters, setCharacters] = useState(initialCharacters);
  const [subscription, setSubscription] = useState(false);
  const [activeNav, setActiveNav] = useState("Painel");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState("");

  const [updateVersion, setUpdateVersion] = useState("");
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);

  const cap = subscription ? 840 : 560;

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const updater = window.abyslordUpdater;
    if (!updater) return;

    updater.onUpdateAvailable((version) => {
      setUpdateVersion(version);
      setUpdateDownloaded(false);
      setUpdateError("");
    });

    updater.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setUpdateBusy(false);
    });

    updater.onUpdateError((message) => {
      setUpdateError(message);
      setUpdateBusy(false);
    });
  }, []);

  async function downloadAbysLordUpdate() {
    const updater = window.abyslordUpdater;

    if (!updater) {
      setUpdateError("Sistema de atualização indisponível.");
      return;
    }

    setUpdateBusy(true);
    setUpdateError("");

    try {
      const result = await updater.downloadUpdate();

      if (!result.ok) {
        setUpdateError(result.message || "Não foi possível baixar a atualização.");
        setUpdateBusy(false);
      }
    } catch (error) {
      setUpdateError(String(error));
      setUpdateBusy(false);
    }
  }

  const totalUnboundKinah = useMemo(
    () => characters.reduce((sum, c) => sum + c.kinahFree, 0),
    [characters]
  );

  const shugoAt = nextBrasiliaHour(now, 1, 0);
  const riftAt = nextBrasiliaHour(now, 3, 5);

  function addCharacter() {
    const name = newName.trim();
    if (!name) return;

    setCharacters(prev => [
      ...prev,
      {
        id: Date.now(),
        name,
        className: newClass.trim() || "Não definido",
        level: 1,
        kinahBound: 0,
        kinahFree: 0,
        abyss: 0,
        energy: 0,
        extraEnergy: 0,
        nightmare: 14,
        bought: 0,
        crafted: 0,
        itemLevel: "—",
        cp: "—"
      }
    ]);

    setNewName("");
    setNewClass("");
    setShowAdd(false);
  }

  if (!loggedInPreview) {
    return (
      <div className="login-screen">
        <div className="login-bg" style={{ backgroundImage: `url("${LUDRA_IMAGE}")` }} />
        <div className="login-vignette" />

        <div className="login-content">
          <div className="login-mark"><Crown size={34} /></div>
          <div className="login-brand">AbysLord</div>
          <div className="login-tagline">DOMINE O ABISMO</div>
          <div className="login-divider" />

          <h1>Sua jornada começa aqui.</h1>
          <p>Acompanhe seus personagens, recursos e eventos do AION 2 em um só lugar.</p>

          <button className="discord-login" onClick={() => setLoggedInPreview(true)}>
            <LogIn size={18} /> Entrar com Discord
          </button>

          <div className="login-foot">
            <Shield size={13} /> Login Discord e sincronização Supabase serão conectados na próxima etapa.
          </div>

          <button className="preview-link" onClick={() => setLoggedInPreview(true)}>
            Visualizar painel de demonstração <ChevronRight size={14} />
          </button>
        </div>

        <div className="login-corner">
          AION 2 COMPANION <span>·</span> BRASÍLIA UTC−3
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">

      {(updateVersion || updateDownloaded || updateError) && (
        <div style={{
          position: "fixed",
          top: 16,
          right: 20,
          zIndex: 9999,
          background: "#17152b",
          border: "1px solid #7655c9",
          borderRadius: 12,
          padding: 18,
          color: "#fff",
          maxWidth: 360,
          width: "calc(100% - 40px)",
          boxShadow: "0 8px 30px #0008"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <RefreshCw size={18} />
            <strong>Atualização do AbysLord</strong>
          </div>

          {updateDownloaded ? (
            <>
              <p>Atualização baixada! Reinicie o aplicativo para instalar.</p>
              <button
                className="primary-button"
                onClick={() => window.abyslordUpdater?.installUpdate()}
              >
                Reiniciar e instalar
              </button>
            </>
          ) : updateVersion ? (
            <>
              <p>Uma nova versão está disponível: v{updateVersion}</p>
              <button
                className="primary-button"
                disabled={updateBusy}
                onClick={downloadAbysLordUpdate}
              >
                {updateBusy ? "Baixando atualização..." : "Baixar atualização"}
              </button>
            </>
          ) : null}

          {updateError && (
            <p style={{ color: "#ff9999", fontSize: 13 }}>
              Erro: {updateError}
            </p>
          )}
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Crown size={23} /></div>
          <div>
            <div className="brand-name">AbysLord</div>
            <div className="brand-sub">AION 2 COMPANION</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        {[
          { name: "Painel", icon: LayoutDashboard },
          { name: "Personagens", icon: Shield },
          { name: "Eventos", icon: CalendarDays },
          { name: "Histórico", icon: Activity }
        ].map(item => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className={`nav-item ${activeNav === item.name ? "active" : ""}`}
              onClick={() => setActiveNav(item.name)}
            >
              <Icon size={17} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setNotice("Configurações serão disponibilizadas em uma próxima etapa.")}
          >
            <Settings size={17} />
            <span>Configurações</span>
          </button>

          <div className="connection">
            <span className="status-dot" /> Prévia local <span className="version">v1.3</span>
          </div>
        </div>
      </aside>

      <main className={`main ${activeNav === "Painel" ? "dashboard-main" : ""}`}>
        <header className="topbar">
          <div className="breadcrumb">AbysLord <span>/</span> {activeNav}</div>

          <div className="top-actions">
            <div className="timezone">BRASÍLIA · UTC−3</div>

            <button
              className={`subscription-control ${subscription ? "enabled" : ""}`}
              onClick={() => setSubscription(v => !v)}
            >
              <Crown size={15} />
              <span>Assinatura {subscription ? "ATIVA" : "INATIVA"}</span>
              <strong>{cap}</strong>
            </button>

            <button
              className="icon-button"
              title="Ajuda"
              onClick={() => setNotice("Esta é uma versão de demonstração visual.")}
            >
              <CircleHelp size={18} />
            </button>

            <div className="avatar">AL</div>
          </div>
        </header>

        <section className="page">
          {activeNav === "Painel" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">VISÃO GERAL DA CONTA</div>
                  <h1>Painel de controle</h1>
                  <p>Acompanhe seus personagens e atividades em um só lugar.</p>
                </div>

                <div className="heading-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setNotice("Os dados desta prévia são demonstrativos.")}
                  >
                    <RefreshCw size={15} /> Atualizar
                  </button>

                  <button className="primary-button" onClick={() => setShowAdd(true)}>
                    <Plus size={16} /> Adicionar personagem
                  </button>
                </div>
              </div>

              <div className="summary-grid">
                <Summary icon={<Users size={18} />} label="PERSONAGENS" value={String(characters.length)} detail="Na sua lista" />
                <Summary icon={<Coins size={18} />} label="KINAH TOTAL" value={fmt(totalUnboundKinah)} detail="Somente Kinah não vinculado" />
                <Summary icon={<CalendarClock size={18} />} label="RESET DIÁRIO" value={getResetCountdown(false, now)} detail="Todos os dias · 04:00 Brasília" timer />
                <Summary icon={<CalendarDays size={18} />} label="RESET SEMANAL" value={getResetCountdown(true, now)} detail="Quarta-feira · 04:00 Brasília" timer />
              </div>

              <div className="section-heading">
                <div>
                  <h2>Checklist de personagens</h2>
                  <p>Os valores abaixo são demonstrativos até conectarmos uma fonte de dados.</p>
                </div>
                <span className="demo-pill"><span /> DADOS DE EXEMPLO</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="activity-col">ATIVIDADE</th>
                      {characters.map(c => (
                        <th className="character-column" key={c.id}>
                          <div className="character-head">
                            <div className="char-avatar">
                              {c.portraitUrl ? <img src={c.portraitUrl} alt={c.name} /> : null}
                              <span>{c.name.slice(0, 1).toUpperCase()}</span>
                            </div>
                            <div>
                              <strong>{c.name}</strong>
                              <small>{c.className} · Nv. {c.level}</small>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    <Group label="RECURSOS" />
                    <DataRow icon={<Coins size={15} />} label="Kinah vinculado" values={characters.map(c => fmt(c.kinahBound))} />
                    <DataRow icon={<Coins size={15} />} label="Kinah não vinculado" values={characters.map(c => fmt(c.kinahFree))} />
                    <DataRow icon={<Swords size={15} />} label="Pontos de Abismo" values={characters.map(c => fmt(c.abyss))} />
                    <DataRow icon={<Zap size={15} />} label="Energia normal" values={characters.map(c => `${fmt(c.energy)} / ${cap} + ${fmt(c.extraEnergy)}`)} accent />
                    <Group label="ATIVIDADES" />
                    <DataRow icon={<Shield size={15} />} label="Masmorra Pesadelo" values={characters.map(c => `${c.nightmare} / 14 disponíveis`)} />
                    <DataRow icon={<Anvil size={15} />} label="Energia comprada (semana)" values={characters.map(c => `${c.bought} / 4`)} />
                    <DataRow icon={<Anvil size={15} />} label="Energia fabricada (semana)" values={characters.map(c => `${c.crafted} / 4`)} />
                  </tbody>
                </table>
              </div>

              <div className="bottom-grid">
                <Info icon={<RefreshCw size={17} />} title="Regras de reset" text="Diário: 04:00 · Semanal: quarta-feira, 04:00 (Brasília)." />
                <Info icon={<Flame size={17} />} title="Energia extra" text="Exibida junto à energia normal; cada uso comprado ou fabricado concede +40." />
              </div>
            </>
          )}

          {activeNav === "Personagens" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SUA CONTA AION 2</div>
                  <h1>Personagens</h1>
                  <p>Visualize seus personagens, equipamentos e poder de combate.</p>
                </div>
                <button className="primary-button" onClick={() => setShowAdd(true)}>
                  <Plus size={16} /> Adicionar personagem
                </button>
              </div>

              <div className="character-grid">
                {characters.map(c => (
                  <article className="profile-card" key={c.id}>
                    <div className="profile-art">
                      <div className="profile-avatar">
                        {c.portraitUrl ? <img src={c.portraitUrl} alt={c.name} /> : <span>{c.name.slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <div className="profile-class">{c.className}</div>
                    </div>

                    <div className="profile-body">
                      <div className="profile-name-row">
                        <h2>{c.name}</h2>
                        <span className="level-tag">NV. {c.level}</span>
                      </div>

                      <div className="profile-stats">
                        <div><small>ITEM LEVEL</small><strong>{c.itemLevel || "—"}</strong></div>
                        <div><small>COMBAT POWER</small><strong>{c.cp || "—"}</strong></div>
                      </div>

                      <div className="profile-meta">
                        {c.region && c.server ? `${c.region} · ${c.server}` : "Servidor não informado"}
                      </div>

                      {c.name === "JolenoSUP" ? (
                        <a className="shugo-button" href={SHUGO_JOLENO} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} /> Ver perfil no Shugo.gg
                        </a>
                      ) : (
                        <button
                          className="shugo-button muted"
                          onClick={() => setNotice("Informe região e servidor para gerar o link correto do perfil Shugo.gg.")}
                        >
                          <ExternalLink size={14} /> Ver perfil no Shugo.gg
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="integration-note">
                <Sparkles size={17} />
                <div>
                  <strong>Foto, Item Level e CP automáticos</strong>
                  <p>Após conectar Discord e a consulta de perfil público, a foto do Discord será usada na conta do jogador e os dados públicos do personagem poderão preencher estes campos.</p>
                </div>
              </div>
            </>
          )}

          {activeNav === "Eventos" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">AGENDA DO AION 2</div>
                  <h1>Eventos</h1>
                  <p>Próximos horários calculados continuamente no horário de Brasília (UTC−3).</p>
                </div>
                <div className="fixed-time"><Clock3 size={15} /> HORÁRIO FIXO · BRASÍLIA</div>
              </div>

              <div className="event-grid">
                <EventCard
                  title="Festival Shugo"
                  subtitle="Acontece a cada hora"
                  time={new Date(shugoAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false })}
                  remaining={countdown(shugoAt, now)}
                  icon={<Sparkles size={22} />}
                  tone="purple"
                  schedule="13:00 · 14:00 · 15:00 · 16:00 · ..."
                />

                <EventCard
                  title="Fenda do Espaço-Tempo"
                  subtitle="Acontece a cada 3 horas"
                  time={new Date(riftAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false })}
                  remaining={countdown(riftAt, now)}
                  icon={<Zap size={22} />}
                  tone="blue"
                  schedule="05:00 · 08:00 · 11:00 · 14:00 · 17:00 · ..."
                />

                <article className="event-card future-event">
                  <div className="event-icon"><Swords size={22} /></div>
                  <div className="event-topline"><span className="future-label">EM BREVE</span></div>
                  <h2>Bosses Mundiais</h2>
                  <p>Horários de aparição, próximos encontros e alertas serão adicionados futuramente.</p>
                  <div className="event-schedule">Calendário de bosses em planejamento</div>
                </article>
              </div>

              <div className="event-alert-note">
                <Bell size={18} />
                <div>
                  <strong>Alertas de eventos</strong>
                  <p>Notificações do Windows e avisos sonoros estão planejados. Nesta prévia, os cartões e contagens regressivas já são demonstrados; os alertas serão conectados depois.</p>
                </div>
              </div>
            </>
          )}

          {activeNav === "Histórico" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ATIVIDADE DA CONTA</div>
                  <h1>Histórico</h1>
                  <p>Registro de alterações, recursos e eventos importantes.</p>
                </div>
              </div>

              <div className="empty-state">
                <Activity size={30} />
                <h2>Seu histórico aparecerá aqui</h2>
                <p>Quando o armazenamento local e a sincronização estiverem conectados, as atividades serão registradas nesta área.</p>
              </div>
            </>
          )}
        </section>

        <footer className="app-footer">
          ABYSLORD <span>·</span> PRÉVIA VISUAL v1.3 <span>·</span> DADOS DEMONSTRATIVOS
        </footer>
      </main>

      {notice && (
        <div className="toast" onClick={() => setNotice("")}>
          {notice}
          <button>×</button>
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <div>
                <h3>Adicionar personagem</h3>
                <p>Cadastre um personagem para acompanhar no painel.</p>
              </div>
              <button className="icon-button" onClick={() => setShowAdd(false)}>×</button>
            </div>

            <label htmlFor="char-name">Nome do personagem</label>
            <input
              id="char-name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCharacter()}
              placeholder="Digite o nome"
            />

            <label htmlFor="char-class" className="second-label">Classe (opcional)</label>
            <input
              id="char-class"
              value={newClass}
              onChange={e => setNewClass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCharacter()}
              placeholder="Ex.: Clérigo, Mago, Templário"
            />

            <p className="portrait-note">
              A foto, Item Level e CP serão preenchidos quando as integrações de conta e perfil público estiverem conectadas.
            </p>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="primary-button" onClick={addCharacter}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ icon, label, value, detail, timer = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  timer?: boolean;
}) {
  return (
    <div className={`summary-card ${timer ? "timer-card" : ""}`}>
      <div className="summary-top">
        <span className="summary-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Group({ label }: { label: string }) {
  return <tr className="group-row"><td colSpan={20}>{label}</td></tr>;
}

function DataRow({ icon, label, values, accent = false }: {
  icon: React.ReactNode;
  label: string;
  values: string[];
  accent?: boolean;
}) {
  return (
    <tr>
      <td>
        <div className="row-label"><span>{icon}</span>{label}</div>
      </td>
      {values.map((v, i) => (
        <td className="character-cell" key={i}>
          <span className={accent ? "value-accent" : "value"}>{v}</span>
        </td>
      ))}
    </tr>
  );
}

function Info({ icon, title, text }: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="info-card">
      <div className="info-icon">{icon}</div>
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  );
}

function EventCard({ title, subtitle, time, remaining, icon, tone, schedule }: {
  title: string;
  subtitle: string;
  time: string;
  remaining: string;
  icon: React.ReactNode;
  tone: string;
  schedule: string;
}) {
  return (
    <article className={`event-card ${tone}`}>
      <div className="event-topline">
        <div className="event-icon">{icon}</div>
        <span className="live-cycle">RECORRÊNCIA AUTOMÁTICA</span>
      </div>

      <h2>{title}</h2>
      <p>{subtitle}</p>

      <div className="event-time-block">
        <span>PRÓXIMO INÍCIO</span>
        <strong>{time}</strong>
      </div>

      <div className="event-countdown">
        <span>TEMPO PARA COMEÇAR</span>
        <strong>{remaining}</strong>
      </div>

      <div className="event-schedule">{schedule}</div>
    </article>
  );
}

export default App;

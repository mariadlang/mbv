"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Check, Circle, Dumbbell, Heart, Leaf, Pencil, PiggyBank, Quote, Rocket, Sparkles, Target, WalletCards } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import { calculateFinanceSummary, calculateFundBalance } from "@/src/domain/financeRules";
import { calculateGoalProgress, isHabitScheduledOn } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, toLocalDateKey } from "@/src/lib/dates";
import { Card, EmptyState, ProgressBar } from "@/src/components/ui/Primitives";

const moodFaces: { name: MoodName; face: string }[] = [
  { name: "Abrumada", face: "⌢" }, { name: "Cansada", face: "—" }, { name: "Calmada", face: "·" }, { name: "Enfocada", face: "⌣" }, { name: "Alegre", face: "◡" },
];
const goalIcons = [Dumbbell, PiggyBank, Rocket];

export function DashboardPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const upcoming = snapshot.tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").sort((a,b) => (a.date ?? "9999").localeCompare(b.date ?? "9999")).slice(0,5);
  const habits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, now)).slice(0,4);
  const todayMood = snapshot.moodLogs.find((log) => log.date === todayKey);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(todayMood?.energy ?? 4);
  const goals = snapshot.goals.filter((goal) => goal.status === "active").slice(0,3);
  const annualProgress = useMemo(() => goals.length ? Math.round(goals.reduce((sum, goal) => sum + calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks), 0) / goals.length) : 0, [goals, snapshot.milestones, snapshot.tasks]);
  const financeSummary = calculateFinanceSummary(snapshot, todayKey.slice(0, 7));
  const financeProfile = snapshot.financialProfiles[0];
  const privacy = financeProfile?.privacyMode ?? snapshot.profile?.financePrivacy ?? false;
  const currency = financeProfile?.baseCurrency ?? snapshot.profile?.baseCurrency ?? "COP";
  const money = (value: number) => privacy ? "••••" : new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const primaryFund = snapshot.savingsFunds[0];

  return <div className="reference-dashboard">
    <header className="dashboard-greeting"><div><h1>Buenos días, {snapshot.profile?.name ?? "María"} <span>👋</span></h1><p>{formatLongDate(now)}</p></div></header>
    <div className="reference-dashboard-grid">
      <Card className="dash-intention ref-card"><div className="ref-card__heading"><h2>Mi intención de hoy</h2><Link to="/app/today" aria-label="Editar intención"><Pencil size={17} /></Link></div><div className="intention-quote"><Quote size={25} /><blockquote>{snapshot.profile?.dailyIntention || "Actuar con enfoque y gratitud para avanzar hacia la vida que deseo."}</blockquote><Heart size={20} /></div></Card>

      <Card className="dash-top3 ref-card"><div className="ref-card__heading"><h2>Top 3</h2><Link to="/app/tasks" aria-label="Editar prioridades"><Pencil size={17} /></Link></div>{todayTasks.length ? <div className="numbered-priorities">{todayTasks.slice(0,3).map((task,index) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={15} /> : index + 1}</span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong></button>)}</div> : <EmptyState title="Elige tus Top 3" text="Tres prioridades son suficientes para dar dirección al día." />}</Card>

      <Card className="dash-goals ref-card"><div className="ref-card__heading"><h2>Metas prioritarias</h2><Link to="/app/goals">Ver todas</Link></div><div className="priority-goal-list">{goals.map((goal,index) => { const Icon=goalIcons[index % goalIcons.length]; const progress=calculateGoalProgress(goal,snapshot.milestones,snapshot.tasks); return <Link to="/app/goals" key={goal.id}><span className="priority-goal__icon"><Icon size={24} /></span><div><strong>{goal.title}</strong><ProgressBar value={progress} label={`Progreso de ${goal.title}`} /><small>{goal.reason}</small></div><b>{progress}%</b></Link>; })}{!goals.length && <EmptyState title="Define una meta" text="Conecta tu semana con una dirección mayor." />}</div><Link className="ref-card__footer-link" to="/app/goals">Ver todas mis metas <ArrowRight size={16} /></Link></Card>

      <Card className="dash-tasks ref-card"><div className="ref-card__heading"><h2>Tareas próximas</h2><Link to="/app/tasks">Ver todas</Link></div><div className="compact-task-list">{upcoming.map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={14} /> : <Circle size={14} />}</span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><CalendarDays size={14} /><small>{task.date === todayKey ? "Hoy" : task.date ?? "Inbox"}</small></button>)}</div></Card>

      <Card className="dash-habits ref-card"><div className="ref-card__heading"><h2>Hábitos de hoy</h2><Link to="/app/habits">Ver hábitos</Link></div><div className="compact-habit-list">{habits.map((habit,index) => { const complete=snapshot.habitLogs.some((log)=>log.habitId===habit.id&&log.date===todayKey); const Icon=[Dumbbell,Target,BookOpen,Sparkles][index%4]; return <button key={habit.id} onClick={() => planner.toggleHabit(habit.id,todayKey)}><Icon size={19}/><strong>{habit.name}</strong>{habit.type === "boolean" ? <div className="week-dots">{[1,2,3,4,5,6,0].map((day) => <i className={habit.scheduledDays.includes(day) ? day === now.getDay() && complete ? "is-complete" : "is-on" : ""} key={day} />)}</div> : <span><b>{complete ? habit.target : 0}</b> / {habit.target} {habit.unit}</span>}</button>; })}</div></Card>

      <Card className="dash-mood ref-card"><h2>Ánimo y energía</h2><div className="dash-mood-inner"><div><h3>¿Cómo está tu ánimo?</h3><div className="dashboard-mood-faces">{moodFaces.map((item) => <button key={item.name} className={todayMood?.mood === item.name ? "is-selected" : ""} onClick={() => planner.saveMood(item.name,energy)} aria-label={item.name}>{item.face}</button>)}</div><p>{todayMood?.note || "Registra cómo te sientes para reconocer patrones con calma."}</p></div><div className="energy-gauge"><h3>¿Cómo está tu energía?</h3><div className="semi-gauge" style={{"--energy": `${energy * 20}%`} as CSSProperties}><span>⚡ <strong>{energy}</strong>/5</span></div><div className="energy-mini-buttons">{([1,2,3,4,5] as const).map((value)=><button key={value} className={energy===value?"is-selected":""} onClick={()=>setEnergy(value)}>{value}</button>)}</div></div></div></Card>

      <Card className="dash-progress ref-card"><div className="ref-card__heading"><h2>Progreso anual</h2><Link to="/app/progress">Ver informe</Link></div><div className="annual-progress"><div className="progress-ring" style={{"--progress": `${annualProgress * 3.6}deg`} as CSSProperties}><span>{annualProgress}%</span></div><div><strong>Avance de tus metas este año</strong>{snapshot.lifeAreas.filter((area)=>area.active).slice(0,4).map((area)=><p key={area.id}><i className={`area-dot area-dot--${area.color}`} />{area.name}<b>{area.currentScore ? area.currentScore*10 : annualProgress}%</b></p>)}</div></div></Card>

      <Card className="dash-review ref-card"><span className="review-icon"><CalendarDays size={26}/></span><div><h2>Revisión semanal</h2><p>Dedica 30 minutos para reflexionar, evaluar y planificar tu próxima semana.</p></div><Link className="button button--primary" to="/app/journal">Iniciar revisión</Link></Card>
      <Card className="dash-finance ref-card"><div className="ref-card__heading"><h2>Finanzas del mes</h2><Link to="/app/finance">Abrir finanzas</Link></div><div className="dash-finance-grid"><span className="dash-finance-icon"><WalletCards size={25}/></span><div><small>Presupuesto disponible</small><strong>{money(financeSummary.availableToAssign)}</strong><p>{financeSummary.budgetUsed === null ? "Registro incompleto" : `${Math.round(financeSummary.budgetUsed)}% del presupuesto de gastos utilizado`}</p></div><div><small>Ahorro registrado</small><strong>{money(financeSummary.savingsContributions)}</strong><p>{primaryFund ? `${primaryFund.name}: ${money(calculateFundBalance(snapshot, primaryFund.id))}` : "Crea un fondo para darle propósito"}</p></div></div></Card>
    </div>
    <footer className="dashboard-quote"><Quote size={18}/><span>Pequeñas acciones diarias crean grandes cambios a largo plazo.</span><Leaf size={26}/></footer>
  </div>;
}

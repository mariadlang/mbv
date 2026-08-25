"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, Eye, EyeOff,
  Building2, Check, Circle, Landmark, PiggyBank, Plus, ReceiptText, RefreshCw, Scale, ShoppingCart, WalletCards,
} from "lucide-react";
import { calculateDebtBalance, calculateFinanceSummary, calculateFundBalance } from "@/src/domain/financeRules";
import { calculateAccountBalance } from "@/src/domain/cascadeRules";
import type { TransactionType } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { transactionFormSchema } from "@/src/lib/schemas";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

type FinanceTab = "summary" | "budget" | "movements" | "accounts" | "purchases" | "funds" | "debts" | "recurring" | "review";

const tabs: { id: FinanceTab; label: string }[] = [
  { id: "summary", label: "Resumen" }, { id: "budget", label: "Presupuesto" },
  { id: "movements", label: "Movimientos" }, { id: "funds", label: "Fondos" },
  { id: "accounts", label: "Bancos" }, { id: "purchases", label: "Compras pendientes" },
  { id: "debts", label: "Deudas" }, { id: "recurring", label: "Recurrentes" },
  { id: "review", label: "Revisión" },
];

const transactionLabels: Record<TransactionType, string> = {
  income: "Ingreso", expense: "Gasto", contribution: "Aporte a fondo",
  withdrawal: "Retiro de fondo", debt_payment: "Pago de deuda", transfer: "Transferencia",
};

export function FinancePage({ planner }: { planner: PlannerController }) {
  const { locale } = useI18n();
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const currentMonth = today.slice(0, 7);
  const [tab, setTab] = useState<FinanceTab>("summary");
  const [feedback, setFeedback] = useState("");
  const [movement, setMovement] = useState({
    type: "expense" as TransactionType, amount: "", date: today, categoryId: "", accountId: "", destinationAccountId: "", fundId: "", debtId: "", note: "",
  });
  const financialProfile = snapshot.financialProfiles[0];
  const currency = financialProfile?.baseCurrency ?? snapshot.profile?.baseCurrency ?? "COP";
  const privacy = financialProfile?.privacyMode ?? snapshot.profile?.financePrivacy ?? false;
  const summary = useMemo(() => calculateFinanceSummary(snapshot, currentMonth), [snapshot, currentMonth]);
  const budget = snapshot.monthlyBudgets.find((item) => item.monthKey === currentMonth);
  const budgetCategories = snapshot.financeCategories.filter((item) => item.type !== "income" && item.active);
  const [plannedIncome, setPlannedIncome] = useState(String(budget?.plannedIncome ?? 0));
  const [budgetNotes, setBudgetNotes] = useState(budget?.notes ?? "");
  const [lineValues, setLineValues] = useState<Record<string, string>>(() => Object.fromEntries(
    budgetCategories.map((category) => [category.id, String(snapshot.budgetLines.find((line) => line.budgetId === budget?.id && line.categoryId === category.id)?.plannedAmount ?? 0)]),
  ));

  const money = (value: number) => privacy
    ? "••••••"
    : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

  const submitMovement = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = transactionFormSchema.safeParse({
      ...movement,
      amount: Number(movement.amount),
      categoryId: movement.categoryId || undefined,
      fundId: movement.fundId || undefined,
      debtId: movement.debtId || undefined,
    });
    if (!parsed.success) return setFeedback("Revisa el valor y la fecha antes de guardar.");
    await planner.createTransaction(parsed.data);
    setMovement({ ...movement, amount: "", note: "" });
    setFeedback("Movimiento guardado. Los totales ya fueron actualizados.");
  };

  const saveBudget = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveMonthlyBudget({
      monthKey: currentMonth,
      plannedIncome: Number(plannedIncome),
      notes: budgetNotes,
      lines: budgetCategories.map((category) => ({ categoryId: category.id, plannedAmount: Number(lineValues[category.id] ?? 0) })),
    });
    setFeedback("Presupuesto guardado para este mes.");
  };

  return <div className="finance-page page-stack">
    <SectionHeading
      eyebrow="Tu dinero también cuenta tu historia"
      title="Finanzas"
      description="Planea, registra y revisa con números simples. Todo permanece en este dispositivo."
      action={<Button variant="secondary" onClick={() => planner.updateProfileSettings({ financePrivacy: !privacy })}>{privacy ? <Eye size={16} /> : <EyeOff size={16} />}{privacy ? " Mostrar valores" : " Ocultar valores"}</Button>}
    />

    <div className="finance-tabs" role="tablist" aria-label="Secciones de finanzas">
      {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : ""} onClick={() => { setTab(item.id); setFeedback(""); }}>{item.label}</button>)}
    </div>
    {feedback && <p className="inline-message" role="status">{feedback}</p>}

    {tab === "summary" && <>
      <div className="finance-metric-grid">
        <button onClick={() => setTab("movements")} className="card finance-metric"><span><ArrowUpRight size={18} /></span><small>Ingresos registrados</small><strong>{money(summary.actualIncome)}</strong></button>
        <button onClick={() => setTab("movements")} className="card finance-metric"><span><ArrowDownRight size={18} /></span><small>Gastos reales</small><strong>{money(summary.actualExpenses)}</strong></button>
        <button onClick={() => setTab("funds")} className="card finance-metric"><span><PiggyBank size={18} /></span><small>Ahorro del mes</small><strong>{money(summary.savingsContributions)}</strong></button>
        <button onClick={() => setTab("debts")} className="card finance-metric"><span><CreditCard size={18} /></span><small>Pagos de deuda</small><strong>{money(summary.debtPayments)}</strong></button>
      </div>
      <div className="finance-summary-grid">
        <Card className="finance-panel">
          <header><div><p className="eyebrow">Presupuesto · {currentMonth}</p><h2>Tu mes en una mirada</h2></div><WalletCards size={24} /></header>
          <div className="finance-summary-lines">
            <p><span>Ingreso planeado</span><strong>{money(summary.plannedIncome)}</strong></p>
            <p><span>Asignado</span><strong>{money(summary.plannedExpenses + summary.plannedSavings + summary.plannedDebt)}</strong></p>
            <p className={summary.availableToAssign < 0 ? "is-alert" : ""}><span>Disponible por asignar</span><strong>{money(summary.availableToAssign)}</strong></p>
            <p><span>Balance real del periodo</span><strong>{money(summary.periodBalance)}</strong></p>
          </div>
          {summary.budgetUsed === null ? <p className="data-note">Registro incompleto: crea tu presupuesto para comparar el plan con lo real.</p> : <ProgressBar value={Math.min(100, Math.round(summary.budgetUsed))} label="Presupuesto de gastos utilizado" />}
          <Button variant="ghost" onClick={() => setTab("budget")}>Revisar presupuesto</Button>
        </Card>
        <Card className="finance-panel">
          <header><div><p className="eyebrow">Ahorro</p><h2>Fondos con propósito</h2></div><PiggyBank size={24} /></header>
          {snapshot.savingsFunds.length ? <div className="finance-compact-list">{snapshot.savingsFunds.slice(0, 3).map((fund) => { const balance = calculateFundBalance(snapshot, fund.id); const progress = Math.min(100, Math.round(balance / fund.targetAmount * 100)); return <button key={fund.id} onClick={() => setTab("funds")}><div><strong>{fund.name}</strong><small>{money(balance)} de {money(fund.targetAmount)}</small></div><b>{progress}%</b></button>; })}</div> : <EmptyState title="Crea tu primer fondo" text="Ponle nombre al ahorro para conectarlo con una meta real." />}
          <p className="formula-note">Tasa de ahorro: {summary.savingsRate === null ? "registro incompleto" : `${Math.round(summary.savingsRate)}%`} · aportes a fondos ÷ ingresos netos registrados.</p>
        </Card>
        <Card className="finance-panel finance-next">
          <header><div><p className="eyebrow">Próximo compromiso</p><h2>Lo que viene</h2></div><CalendarClock size={24} /></header>
          {snapshot.recurringItems.filter((item) => item.active).sort((a, b) => a.dayOfMonth - b.dayOfMonth)[0] ? (() => { const item = snapshot.recurringItems.filter((entry) => entry.active).sort((a, b) => a.dayOfMonth - b.dayOfMonth)[0]; return <div className="next-commitment"><span>{item.dayOfMonth}</span><div><strong>{item.name}</strong><p>{money(item.amount)} · cada mes</p></div></div>; })() : <EmptyState title="Sin compromisos recurrentes" text="Añade solo los que quieras tener presentes." />}
          {summary.incomplete && <Badge tone="warm">Registro incompleto</Badge>}
        </Card>
      </div>
    </>}

    {tab === "budget" && <Card className="finance-form-card"><header><div><p className="eyebrow">Plan vs. real</p><h2>Presupuesto mensual · {currentMonth}</h2></div><Scale size={24} /></header><form onSubmit={saveBudget} className="finance-form-grid">
      <label className="form-field"><span>Ingreso planeado</span><input type="number" min="0" value={plannedIncome} onChange={(event) => setPlannedIncome(event.target.value)} /></label>
      {budgetCategories.map((category) => <label className="form-field" key={category.id}><span>{category.name} · {category.type === "expense" ? "gasto" : category.type === "savings" ? "ahorro" : "deuda"}</span><input type="number" min="0" value={lineValues[category.id] ?? "0"} onChange={(event) => setLineValues({ ...lineValues, [category.id]: event.target.value })} /></label>)}
      <label className="form-field form-field--full"><span>Nota del mes</span><textarea rows={3} value={budgetNotes} onChange={(event) => setBudgetNotes(event.target.value)} placeholder="¿Qué quieres priorizar con este presupuesto?" /></label>
      <div className="finance-budget-result"><span>Disponible por asignar</span><strong>{money(Number(plannedIncome) - Object.values(lineValues).reduce((sum, value) => sum + Number(value || 0), 0))}</strong></div>
      <Button type="submit">Guardar presupuesto</Button>
    </form></Card>}

    {tab === "movements" && <div className="finance-two-column">
      <Card className="finance-form-card"><header><div><p className="eyebrow">Registro manual</p><h2>Nuevo movimiento</h2></div><Plus size={22} /></header><form className="finance-form-grid" onSubmit={submitMovement}>
        <label className="form-field"><span>Tipo</span><select value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value as TransactionType, categoryId: "", fundId: "", debtId: "" })}>{Object.entries(transactionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Valor</span><input type="number" min="1" value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} placeholder="0" /></label>
        <label className="form-field"><span>Fecha</span><input type="date" value={movement.date} onChange={(event) => setMovement({ ...movement, date: event.target.value })} /></label>
        <label className="form-field"><span>Categoría</span><select value={movement.categoryId} onChange={(event) => setMovement({ ...movement, categoryId: event.target.value })}><option value="">Sin categoría</option>{snapshot.financeCategories.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Cuenta o banco</span><select value={movement.accountId} onChange={(event) => setMovement({ ...movement, accountId: event.target.value })}><option value="">Sin cuenta</option>{snapshot.financialAccounts.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {movement.type === "transfer" && <label className="form-field"><span>Cuenta destino</span><select value={movement.destinationAccountId} onChange={(event) => setMovement({ ...movement, destinationAccountId: event.target.value })}><option value="">Selecciona</option>{snapshot.financialAccounts.filter((item) => item.status === "active" && item.id !== movement.accountId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {(movement.type === "contribution" || movement.type === "withdrawal") && <label className="form-field"><span>Fondo</span><select aria-label="Fondo de ahorro" value={movement.fundId} onChange={(event) => setMovement({ ...movement, fundId: event.target.value })}><option value="">Selecciona</option>{snapshot.savingsFunds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {movement.type === "debt_payment" && <label className="form-field"><span>Deuda</span><select value={movement.debtId} onChange={(event) => setMovement({ ...movement, debtId: event.target.value })}><option value="">Selecciona</option>{snapshot.debts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="form-field form-field--full"><span>Nota</span><input value={movement.note} onChange={(event) => setMovement({ ...movement, note: event.target.value })} placeholder="Una descripción breve" /></label>
        <Button type="submit">Guardar movimiento</Button>
      </form></Card>
      <Card className="finance-panel"><header><div><p className="eyebrow">Detalle</p><h2>Movimientos del mes</h2></div><ReceiptText size={22} /></header><div className="movement-list">{snapshot.transactions.filter((item) => item.date.startsWith(currentMonth) && item.status === "active").map((item) => { const category = snapshot.financeCategories.find((entry) => entry.id === item.categoryId); const account = snapshot.financialAccounts.find((entry) => entry.id === item.accountId); return <div key={item.id}><span className={`movement-icon movement-icon--${item.type}`}>{item.type === "income" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span><div><strong>{item.note || category?.name || transactionLabels[item.type]}</strong><small>{item.date} · {transactionLabels[item.type]} · {category?.name ?? "Sin categoría"}{account ? ` · ${account.name}` : ""}</small></div><b>{money(item.amount)}</b></div>; })}{!snapshot.transactions.some((item) => item.date.startsWith(currentMonth)) && <EmptyState title="Aún no hay movimientos" text="Registra el primero para comenzar tu resumen." />}</div></Card>
    </div>}

    {tab === "funds" && <FundsPanel planner={planner} money={money} />}
    {tab === "accounts" && <AccountsPanel planner={planner} money={money} />}
    {tab === "purchases" && <PurchasesPanel planner={planner} money={money} />}
    {tab === "debts" && <DebtsPanel planner={planner} money={money} />}
    {tab === "recurring" && <RecurringPanel planner={planner} money={money} />}
    {tab === "review" && <ReviewPanel planner={planner} monthKey={currentMonth} />}
  </div>;
}

function AccountsPanel({ planner, money }: { planner: PlannerController; money: (value: number) => string }) {
  const [form, setForm] = useState({ name: "", type: "bank" as "cash" | "bank" | "wallet" | "other", initialBalance: "" });
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; await planner.createFinancialAccount({ name: form.name, type: form.type, initialBalance: Number(form.initialBalance || 0) }); setForm({ name: "", type: "bank", initialBalance: "" }); };
  return <div className="finance-two-column"><Card className="finance-form-card"><header><div><p className="eyebrow">Disponible por lugar</p><h2>Nueva cuenta</h2></div><Building2 size={22} /></header><form className="finance-form-grid" onSubmit={submit}><label className="form-field"><span>Nombre</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Banco principal" /></label><label className="form-field"><span>Tipo</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })}><option value="bank">Banco</option><option value="cash">Efectivo</option><option value="wallet">Billetera</option><option value="other">Otra</option></select></label><label className="form-field"><span>Saldo inicial</span><input type="number" value={form.initialBalance} onChange={(event) => setForm({ ...form, initialBalance: event.target.value })} /></label><Button type="submit">Guardar cuenta</Button></form></Card><div className="account-grid">{planner.snapshot.financialAccounts.map((account) => { const currentBalance = calculateAccountBalance(planner.snapshot, account.id); return <Card className="account-card" key={account.id}><span><Building2 size={19} /></span><Badge tone="neutral">{account.type}</Badge><h3>{account.name}</h3><strong>{money(currentBalance)}</strong><label className="form-field"><span>Corregir saldo actual</span><input type="number" defaultValue={currentBalance} onBlur={(event) => planner.adjustFinancialAccountBalance(account.id, Number(event.target.value))} /></label><small>La corrección conserva el historial de movimientos y registra solo la diferencia.</small></Card>; })}</div></div>;
}

function PurchasesPanel({ planner, money }: { planner: PlannerController; money: (value: number) => string }) {
  const [form, setForm] = useState({ title: "", estimatedAmount: "", accountId: "", tentativeDate: "", priority: "medium" as "low" | "medium" | "high" });
  const [dateMode, setDateMode] = useState<"flexible" | "month" | "date">("flexible");
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.title.trim()) return; await planner.createPendingPurchase({ title: form.title, estimatedAmount: Number(form.estimatedAmount), accountId: form.accountId || undefined, tentativeDate: form.tentativeDate || undefined, priority: form.priority }); setForm({ title: "", estimatedAmount: "", accountId: "", tentativeDate: "", priority: "medium" }); setDateMode("flexible"); };
  return <div className="finance-two-column"><Card className="finance-form-card"><header><div><p className="eyebrow">Compra consciente</p><h2>Nueva compra pendiente</h2></div><ShoppingCart size={22} /></header><form className="finance-form-grid" onSubmit={submit}><label className="form-field"><span>Compra</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="form-field"><span>Monto estimado</span><input required type="number" min="1" value={form.estimatedAmount} onChange={(event) => setForm({ ...form, estimatedAmount: event.target.value })} /></label><label className="form-field"><span>Pagar desde</span><select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">Sin decidir</option>{planner.snapshot.financialAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset className="date-mode-field"><legend>Cuándo podría comprarlo</legend><div><label><input type="radio" checked={dateMode === "flexible"} onChange={() => { setDateMode("flexible"); setForm({ ...form, tentativeDate: "" }); }} /> Flexible</label><label><input type="radio" checked={dateMode === "month"} onChange={() => { setDateMode("month"); setForm({ ...form, tentativeDate: "" }); }} /> Mes</label><label><input type="radio" checked={dateMode === "date"} onChange={() => { setDateMode("date"); setForm({ ...form, tentativeDate: "" }); }} /> Fecha</label></div>{dateMode !== "flexible" && <input aria-label={dateMode === "month" ? "Mes tentativo" : "Fecha tentativa"} type={dateMode === "month" ? "month" : "date"} value={form.tentativeDate} onChange={(event) => setForm({ ...form, tentativeDate: event.target.value })} />}</fieldset><Button type="submit">Guardar compra</Button></form></Card><Card className="finance-panel"><header><div><p className="eyebrow">Antes de comprar</p><h2>Pendientes y disponibilidad</h2></div><ShoppingCart size={22} /></header><div className="pending-purchase-list">{planner.snapshot.pendingPurchases.map((item) => { const available = item.accountId ? calculateAccountBalance(planner.snapshot, item.accountId) : null; return <div key={item.id}><button aria-label={item.status === "purchased" ? `Reabrir ${item.title}` : `Marcar ${item.title} como comprada`} onClick={() => planner.updatePendingPurchase(item.id, item.status === "purchased" ? "pending" : "purchased")}>{item.status === "purchased" ? <Check size={15} /> : <Circle size={15} />}</button><div><strong>{item.title}</strong><small>{item.tentativeDate || "Fecha flexible"} · disponible {available === null ? "sin cuenta" : money(available)}</small></div><b>{money(item.estimatedAmount)}</b></div>; })}</div></Card></div>;
}

function FundsPanel({ planner, money }: { planner: PlannerController; money: (value: number) => string }) {
  const { snapshot } = planner;
  const [form, setForm] = useState({ name: "", targetAmount: "", initialAmount: "0", targetDate: "" });
  const submit = async (event: FormEvent) => { event.preventDefault(); await planner.createSavingsFund({ name: form.name, targetAmount: Number(form.targetAmount), initialAmount: Number(form.initialAmount), targetDate: form.targetDate || undefined }); setForm({ name: "", targetAmount: "", initialAmount: "0", targetDate: "" }); };
  return <div className="finance-two-column"><Card className="finance-form-card"><header><div><p className="eyebrow">Ahorro con intención</p><h2>Nuevo fondo</h2></div><PiggyBank size={22} /></header><form className="finance-form-grid" onSubmit={submit}><label className="form-field"><span>Nombre</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Viaje familiar" /></label><label className="form-field"><span>Meta</span><input required type="number" min="1" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} /></label><label className="form-field"><span>Saldo inicial</span><input type="number" min="0" value={form.initialAmount} onChange={(e) => setForm({ ...form, initialAmount: e.target.value })} /></label><label className="form-field"><span>Fecha objetivo</span><input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></label><Button type="submit">Crear fondo</Button></form></Card><div className="fund-grid">{snapshot.savingsFunds.map((fund) => { const balance = calculateFundBalance(snapshot, fund.id); const progress = Math.min(100, Math.round(balance / fund.targetAmount * 100)); return <Card className="fund-card" key={fund.id}><PiggyBank size={22} /><h3>{fund.name}</h3><strong>{money(balance)}</strong><small>de {money(fund.targetAmount)}</small><ProgressBar value={progress} label="Avance del fondo" /><p>Saldo = inicial + aportes − retiros.</p></Card>; })}</div></div>;
}

function DebtsPanel({ planner, money }: { planner: PlannerController; money: (value: number) => string }) {
  const { snapshot } = planner;
  const [form, setForm] = useState({ name: "", initialBalance: "", informativeRate: "", minimumPayment: "", dueDay: "" });
  const submit = async (event: FormEvent) => { event.preventDefault(); await planner.createDebt({ name: form.name, initialBalance: Number(form.initialBalance), informativeRate: form.informativeRate ? Number(form.informativeRate) : undefined, minimumPayment: form.minimumPayment ? Number(form.minimumPayment) : undefined, dueDay: form.dueDay ? Number(form.dueDay) : undefined }); setForm({ name: "", initialBalance: "", informativeRate: "", minimumPayment: "", dueDay: "" }); };
  return <div className="finance-two-column"><Card className="finance-form-card"><header><div><p className="eyebrow">Seguimiento simple</p><h2>Nueva deuda</h2></div><CreditCard size={22} /></header><form className="finance-form-grid" onSubmit={submit}><label className="form-field"><span>Nombre</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-field"><span>Saldo inicial</span><input required type="number" min="1" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} /></label><label className="form-field"><span>Tasa informativa (%)</span><input type="number" min="0" step="0.1" value={form.informativeRate} onChange={(e) => setForm({ ...form, informativeRate: e.target.value })} /></label><label className="form-field"><span>Pago mínimo</span><input type="number" min="0" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} /></label><label className="form-field"><span>Día de pago</span><input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} /></label><Button type="submit">Guardar deuda</Button></form></Card><div className="fund-grid">{snapshot.debts.map((debt) => <Card className="fund-card" key={debt.id}><CreditCard size={22} /><h3>{debt.name}</h3><strong>{money(calculateDebtBalance(snapshot, debt.id))}</strong><small>saldo manual pendiente</small>{debt.minimumPayment && <p>Pago mínimo: {money(debt.minimumPayment)} · día {debt.dueDay ?? "—"}</p>}{debt.informativeRate !== undefined && <Badge tone="neutral">Tasa informativa {debt.informativeRate}%</Badge>}</Card>)}</div></div>;
}

function RecurringPanel({ planner, money }: { planner: PlannerController; money: (value: number) => string }) {
  const { snapshot } = planner;
  const [form, setForm] = useState({ name: "", type: "expense" as "income" | "expense" | "contribution" | "debt_payment", amount: "", dayOfMonth: "1" });
  const submit = async (event: FormEvent) => { event.preventDefault(); await planner.createRecurringItem({ ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth) }); setForm({ name: "", type: "expense", amount: "", dayOfMonth: "1" }); };
  return <div className="finance-two-column"><Card className="finance-form-card"><header><div><p className="eyebrow">Recordatorios mensuales</p><h2>Nuevo recurrente</h2></div><RefreshCw size={22} /></header><form className="finance-form-grid" onSubmit={submit}><label className="form-field"><span>Nombre</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-field"><span>Tipo</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}><option value="expense">Gasto</option><option value="income">Ingreso</option><option value="contribution">Aporte</option><option value="debt_payment">Pago de deuda</option></select></label><label className="form-field"><span>Valor</span><input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label className="form-field"><span>Día del mes</span><input required type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} /></label><Button type="submit">Guardar recurrente</Button></form></Card><Card className="finance-panel"><header><div><p className="eyebrow">Tu calendario financiero</p><h2>Próximos compromisos</h2></div><CalendarClock size={22} /></header><div className="recurring-list">{snapshot.recurringItems.map((item) => <div key={item.id}><span>{item.dayOfMonth}</span><div><strong>{item.name}</strong><small>{transactionLabels[item.type]}</small></div><b>{money(item.amount)}</b></div>)}</div></Card></div>;
}

function ReviewPanel({ planner, monthKey }: { planner: PlannerController; monthKey: string }) {
  const existing = planner.snapshot.financialReviews.find((item) => item.monthKey === monthKey);
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [decision, setDecision] = useState(existing?.decisions.join("\n") ?? "");
  return <Card className="financial-review"><Landmark size={28} /><div><p className="eyebrow">Cierre consciente · {monthKey}</p><h2>Revisión financiera</h2><p>Observa lo que ocurrió, nombra una decisión y prepara el siguiente mes sin exigirte perfección.</p></div><label className="form-field"><span>¿Qué funcionó y qué te sorprendió?</span><textarea rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label className="form-field"><span>Decisiones para el próximo mes · una por línea</span><textarea rows={4} value={decision} onChange={(event) => setDecision(event.target.value)} /></label><Button disabled={!summary.trim()} onClick={() => planner.saveFinancialReview(monthKey, summary, decision.split("\n"))}>Guardar revisión</Button></Card>;
}

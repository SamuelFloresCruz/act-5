import { useState, useCallback, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Home, Activity, BookOpen, School, Phone,
  AlertTriangle, CheckCircle, Download, ChevronDown, ChevronUp,
  Apple, Zap, User, Calendar, Weight, Ruler,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import * as measurementController from "./controllers/measurementController";

// ─── Types ───────────────────────────────────────────────────────────────────

type PageKey = "inicio" | "estado" | "educacion" | "monitoreo" | "contacto";

interface NinoData {
  nombre: string;
  edad: number;
  peso: number;
  talla: number;
  imc: number;
  estado: "normal" | "bajo_peso" | "sobrepeso" | "obesidad";
}

interface HistorialItem extends NinoData {
  measured_at: string;
  child_id: string;
}



interface MeasurementRow {
  id: string;
  child_id: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  bmi_status: NinoData["estado"];
  measured_at: string;
}

interface LatestMeasurementRow extends MeasurementRow {
  full_name: string;
  age_years: number | null;
}

interface TipRow {
  id: string;
  tip: string;
  sort_order: number | null;
}

interface FoodComparisonRow {
  id: string;
  local_name: string;
  local_emoji: string | null;
  local_calories: number | null;
  local_protein: number | null;
  local_sugar: number | null;
  local_vitamins: string | null;
  processed_name: string;
  processed_emoji: string | null;
  processed_calories: number | null;
  processed_protein: number | null;
  processed_sugar: number | null;
  processed_vitamins: string | null;
}

interface EducationGameRow {
  id: string;
  title: string;
  description: string;
  icon_emoji: string | null;
}

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number | null;
}

interface GuideRow {
  id: string;
  title: string;
  type: string;
  emoji: string | null;
  url: string | null;
}

interface ContactInfoRow {
  id: string;
  label: string;
  value: string;
  sort_order: number | null;
}

// ─── Factory Method Pattern ───────────────────────────────────────────────────

interface PageProduct {
  render(): JSX.Element;
}

abstract class PageCreator {
  abstract createPage(props: PageProps): PageProduct;

  renderPage(props: PageProps): JSX.Element {
    return this.createPage(props).render();
  }
}

interface PageProps {
  onNavigate: (page: PageKey) => void;
}

// ─── Concrete Products ────────────────────────────────────────────────────────

class InicioPageProduct implements PageProduct {
  constructor(private props: PageProps) {}
  render() {
    return <InicioView {...this.props} />;
  }
}

class EstadoPageProduct implements PageProduct {
  constructor(private props: PageProps) {}
  render() {
    return <EstadoNutricionalView {...this.props} />;
  }
}

class EducacionPageProduct implements PageProduct {
  constructor(private props: PageProps) {}
  render() {
    return <EducacionView {...this.props} />;
  }
}

class MonitoreoPageProduct implements PageProduct {
  constructor(private props: PageProps) {}
  render() {
    return <MonitoreoView {...this.props} />;
  }
}

class ContactoPageProduct implements PageProduct {
  constructor(private props: PageProps) {}
  render() {
    return <ContactoView {...this.props} />;
  }
}

// ─── Concrete Creators ────────────────────────────────────────────────────────

class InicioCreator extends PageCreator {
  createPage(props: PageProps): PageProduct {
    return new InicioPageProduct(props);
  }
}

class EstadoCreator extends PageCreator {
  createPage(props: PageProps): PageProduct {
    return new EstadoPageProduct(props);
  }
}

class EducacionCreator extends PageCreator {
  createPage(props: PageProps): PageProduct {
    return new EducacionPageProduct(props);
  }
}

class MonitoreoCreator extends PageCreator {
  createPage(props: PageProps): PageProduct {
    return new MonitoreoPageProduct(props);
  }
}

class ContactoCreator extends PageCreator {
  createPage(props: PageProps): PageProduct {
    return new ContactoPageProduct(props);
  }
}

// ─── Factory Registry ─────────────────────────────────────────────────────────

const pageFactory: Record<PageKey, PageCreator> = {
  inicio: new InicioCreator(),
  estado: new EstadoCreator(),
  educacion: new EducacionCreator(),
  monitoreo: new MonitoreoCreator(),
  contacto: new ContactoCreator(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularIMC(peso: number, talla: number): number {
  const tallaMt = talla / 100;
  return parseFloat((peso / (tallaMt * tallaMt)).toFixed(1));
}

function clasificarIMC(imc: number, edad: number): NinoData["estado"] {
  // Simplified percentile approximation for children
  if (edad <= 5) {
    if (imc < 14) return "bajo_peso";
    if (imc <= 17) return "normal";
    if (imc <= 19) return "sobrepeso";
    return "obesidad";
  }
  if (imc < 15.5) return "bajo_peso";
  if (imc <= 21) return "normal";
  if (imc <= 24) return "sobrepeso";
  return "obesidad";
}

function estadoLabel(estado: NinoData["estado"]): string {
  const labels: Record<NinoData["estado"], string> = {
    normal: "Normal",
    bajo_peso: "Bajo Peso",
    sobrepeso: "Sobrepeso",
    obesidad: "Obesidad",
  };
  return labels[estado];
}

function estadoColor(estado: NinoData["estado"]): string {
  const colors: Record<NinoData["estado"], string> = {
    normal: "text-accent bg-accent/10 border-accent/30",
    bajo_peso: "text-amber-700 bg-amber-50 border-amber-300",
    sobrepeso: "text-orange-700 bg-orange-50 border-orange-300",
    obesidad: "text-destructive bg-destructive/10 border-destructive/30",
  };
  return colors[estado];
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold text-foreground leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground text-base">{subtitle}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const navItems: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: "inicio", label: "Inicio", icon: <Home size={18} /> },
  { key: "estado", label: "Estado Nutricional", icon: <Activity size={18} /> },
  { key: "educacion", label: "Educación", icon: <BookOpen size={18} /> },
  { key: "monitoreo", label: "Monitoreo Escolar", icon: <School size={18} /> },
  { key: "contacto", label: "Contacto", icon: <Phone size={18} /> },
];

function Navbar({ current, onNavigate }: { current: PageKey; onNavigate: (p: PageKey) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌽</span>
          <span className="font-display font-bold text-lg leading-tight">
            NutriBolivia
            <span className="block text-xs font-normal opacity-80 -mt-1">Seguimiento Nutricional Infantil</span>
          </span>
        </div>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => onNavigate(item.key)}
                data-active={current === item.key}
                className={`nav-button flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  current === item.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-5 h-0.5 bg-primary-foreground mb-1" />
          <div className="w-5 h-0.5 bg-primary-foreground mb-1" />
          <div className="w-5 h-0.5 bg-primary-foreground" />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-primary-foreground/20 bg-primary">
          {navItems.map((item) => (
            <button
              key={item.key}
              data-active={current === item.key}
              onClick={() => { onNavigate(item.key); setMenuOpen(false); }}
              className={`nav-button w-full flex items-center gap-3 px-6 py-3 text-sm text-left transition-colors ${
                current === item.key
                  ? "bg-primary-foreground/20"
                  : "hover:bg-primary-foreground/10 text-primary-foreground/80"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── INICIO VIEW ──────────────────────────────────────────────────────────────

function InicioView({ onNavigate }: PageProps) {
  const [stats, setStats] = useState<{
    totalChildren: number;
    atRisk: number;
    measurementsThisMonth: number;
  } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(supabase ? null : "Configura las variables de Supabase para ver indicadores.");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const loadStats = async () => {
      try {
        const { totalChildren, atRisk } = await measurementController.loadLatestAndCounts();
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const count = await measurementController.countSince(startOfMonth.toISOString());
        if (!cancelled) {
          setStats({ totalChildren, atRisk, measurementsThisMonth: count ?? 0 });
        }
      } catch {
        if (!cancelled) setStatsError("No se pudieron cargar los indicadores.");
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="inline-block bg-accent/10 text-accent text-xs font-mono font-medium px-3 py-1 rounded-full mb-4 border border-accent/20 uppercase tracking-wider">
            Sistema Nacional · Bolivia
          </span>
          <h1 className="font-display text-4xl font-bold text-foreground leading-tight mb-4">
            Cuida la nutrición<br />
            <span className="text-primary">de los niños bolivianos</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Herramienta de seguimiento nutricional para familias, docentes y
            profesionales de salud. Registra, analiza y actúa a tiempo.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("estado")}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Activity size={16} /> Registrar datos
            </button>
            <button
              onClick={() => onNavigate("educacion")}
              className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <BookOpen size={16} /> Aprender más
            </button>
          </div>
        </div>
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&h=420&fit=crop&auto=format"
            alt="Niños bolivianos saludables"
            className="rounded-2xl shadow-lg w-full object-cover h-72 bg-muted"
          />
          <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <CheckCircle size={20} className="text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Niños monitoreados</div>
                <div className="font-display font-bold text-lg text-foreground">
                  {stats ? stats.totalChildren : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Indicadores del programa
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { valor: stats ? stats.totalChildren : "—", desc: "niños registrados", icon: "👧" },
            { valor: stats ? stats.atRisk : "—", desc: "niños con alerta nutricional", icon: "⚠️" },
            { valor: stats ? stats.measurementsThisMonth : "—", desc: "controles en el mes", icon: "📋" },
          ].map((stat) => (
            <div key={stat.desc} className="text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="font-display text-3xl font-bold text-primary mb-1">{stat.valor}</div>
              <p className="text-sm text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>
        {statsError && (
          <p className="text-xs text-muted-foreground mt-4">{statsError}</p>
        )}
      </div>

      {/* Quick access */}
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-5">Acceso rápido</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navItems.slice(1).map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="nav-button bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="bg-primary/10 text-primary p-2.5 rounded-lg inline-block mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {item.icon}
              </div>
              <div className="font-semibold text-foreground text-sm">{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Plan alimentario por estado nutricional ──────────────────────────────────

interface Comida {
  nombre: string;
  descripcion: string;
  emoji: string;
}

interface PlanDiario {
  desayuno: Comida;
  meriendaManana: Comida;
  almuerzo: Comida;
  meriendaTarde: Comida;
  cena: Comida;
  nota: string;
}

const planesAlimentarios: Record<NinoData["estado"], PlanDiario> = {
  bajo_peso: {
    desayuno: {
      nombre: "Desayuno energético",
      descripcion: "Api morado con leche entera + pan con mantequilla y huevo frito + jugo de naranja natural",
      emoji: "🍳",
    },
    meriendaManana: {
      nombre: "Merienda de media mañana",
      descripcion: "Plátano maduro + maní tostado (puñado pequeño) + vaso de leche con cacao",
      emoji: "🍌",
    },
    almuerzo: {
      nombre: "Almuerzo completo",
      descripcion: "Sopa de quinua con verduras + segundo de pollo guisado con arroz, papa y ensalada de zanahoria + jugo de fruta natural",
      emoji: "🍲",
    },
    meriendaTarde: {
      nombre: "Merienda de tarde",
      descripcion: "Tostadas integrales con queso fresco + vaso de yogur natural + fruta de temporada",
      emoji: "🧀",
    },
    cena: {
      nombre: "Cena nutritiva",
      descripcion: "Sopa de fideos con huevo + pan de molde con palta + vaso de leche tibia con miel",
      emoji: "🍜",
    },
    nota: "⚠️ El niño/a presenta bajo peso. Se recomienda aumentar la frecuencia de comidas y la densidad calórica. Consulta con un nutricionista.",
  },
  normal: {
    desayuno: {
      nombre: "Desayuno equilibrado",
      descripcion: "Leche con avena y fruta picada + pan con queso fresco o palta + jugo natural",
      emoji: "🥣",
    },
    meriendaManana: {
      nombre: "Merienda de media mañana",
      descripcion: "Fruta de temporada (manzana, durazno, mandarina) + agua",
      emoji: "🍎",
    },
    almuerzo: {
      nombre: "Almuerzo balanceado",
      descripcion: "Sopa liviana + segundo con proteína (carne, pollo o pescado), carbohidrato (arroz o papa) y verdura cocida + agua o jugo natural sin azúcar",
      emoji: "🍽️",
    },
    meriendaTarde: {
      nombre: "Merienda de tarde",
      descripcion: "Yogur natural con granola + fruta fresca",
      emoji: "🫙",
    },
    cena: {
      nombre: "Cena ligera",
      descripcion: "Sopa de verduras + pan con queso o huevo + infusión de manzanilla o té de menta",
      emoji: "🥗",
    },
    nota: "✅ El niño/a tiene un estado nutricional normal. Mantén los hábitos actuales y realiza controles regulares cada 3 meses.",
  },
  sobrepeso: {
    desayuno: {
      nombre: "Desayuno moderado",
      descripcion: "Leche descremada con avena sin azúcar + fruta fresca (no jugo) + pan integral sin mantequilla",
      emoji: "🥛",
    },
    meriendaManana: {
      nombre: "Merienda de media mañana",
      descripcion: "Zanahoria o pepino en bastones + agua o agua con limón sin azúcar",
      emoji: "🥕",
    },
    almuerzo: {
      nombre: "Almuerzo controlado",
      descripcion: "Sopa de verduras sin fideos grasos + segundo con proteína magra (pollo sin piel, pescado), ensalada abundante y porción moderada de carbohidrato (papa o arroz integral)",
      emoji: "🥙",
    },
    meriendaTarde: {
      nombre: "Merienda de tarde",
      descripcion: "Fruta fresca entera (no jugos) + puñado pequeño de maní sin sal",
      emoji: "🍇",
    },
    cena: {
      nombre: "Cena liviana",
      descripcion: "Sopa de verduras + huevo pochado o a la plancha + ensalada de lechuga y tomate + agua",
      emoji: "🥚",
    },
    nota: "⚠️ El niño/a presenta sobrepeso. Reduce alimentos ultra-procesados, gaseosas y frituras. Fomenta actividad física diaria de al menos 60 minutos.",
  },
  obesidad: {
    desayuno: {
      nombre: "Desayuno bajo en calorías",
      descripcion: "Leche descremada sin azúcar + fruta fresca (manzana o naranja) + 1 tostada integral sin mantequilla",
      emoji: "🍊",
    },
    meriendaManana: {
      nombre: "Merienda de media mañana",
      descripcion: "Agua con limón sin azúcar + pepino o apio en trozos",
      emoji: "💧",
    },
    almuerzo: {
      nombre: "Almuerzo terapéutico",
      descripcion: "Caldo de verduras + proteína magra al horno o a la plancha (pollo sin piel, pescado, carne magra) + ensalada grande de verduras crudas + porción muy pequeña de carbohidrato",
      emoji: "🥦",
    },
    meriendaTarde: {
      nombre: "Merienda de tarde",
      descripcion: "Fruta fresca entera (1 pieza pequeña) + agua",
      emoji: "🍓",
    },
    cena: {
      nombre: "Cena muy liviana",
      descripcion: "Sopa de verduras sin papa ni fideos + huevo a la plancha o queso fresco bajo en grasa + ensalada sin aderezo",
      emoji: "🥬",
    },
    nota: "🚨 El niño/a presenta obesidad. Es URGENTE consultar con un médico o nutricionista. Elimina gaseosas, frituras y alimentos ultra-procesados. Actividad física diaria supervisada.",
  },
};

const comidaHorarios: { key: keyof Omit<PlanDiario, "nota">; hora: string; label: string }[] = [
  { key: "desayuno", hora: "07:00", label: "Desayuno" },
  { key: "meriendaManana", hora: "10:00", label: "Merienda mañana" },
  { key: "almuerzo", hora: "12:30", label: "Almuerzo" },
  { key: "meriendaTarde", hora: "16:00", label: "Merienda tarde" },
  { key: "cena", hora: "19:00", label: "Cena" },
];

function PlanAlimentario({ estado }: { estado: NinoData["estado"] }) {
  const plan = planesAlimentarios[estado];
  const [activo, setActivo] = useState<string>("desayuno");

  const notaColor: Record<NinoData["estado"], string> = {
    normal: "bg-accent/10 border-accent/30 text-accent",
    bajo_peso: "bg-amber-50 border-amber-300 text-amber-800",
    sobrepeso: "bg-orange-50 border-orange-300 text-orange-800",
    obesidad: "bg-destructive/10 border-destructive/30 text-destructive",
  };

  const comidaActiva = plan[activo as keyof Omit<PlanDiario, "nota">] as Comida;

  return (
    <Card className="mt-6">
      <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
        🥗 Plan alimentario diario
      </h2>
      <p className="text-xs text-muted-foreground mb-5">Recomendación según estado nutricional detectado</p>

      {/* Nota */}
      <div className={`rounded-lg border px-4 py-3 text-sm font-medium mb-5 ${notaColor[estado]}`}>
        {plan.nota}
      </div>

      {/* Selector de comida */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {comidaHorarios.map((c) => (
          <button
            key={c.key}
            onClick={() => setActivo(c.key)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium shrink-0 transition-all ${
              activo === c.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <span className="font-mono text-[10px] opacity-70 mb-0.5">{c.hora}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Detalle de comida */}
      <div className="bg-secondary rounded-xl p-5 flex gap-4 items-start">
        <div className="text-4xl shrink-0">{comidaActiva.emoji}</div>
        <div>
          <div className="font-display font-bold text-foreground mb-1">{comidaActiva.nombre}</div>
          <p className="text-sm text-muted-foreground leading-relaxed">{comidaActiva.descripcion}</p>
        </div>
      </div>

      {/* Resumen visual de las 5 comidas */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {comidaHorarios.map((c) => {
          const comida = plan[c.key] as Comida;
          return (
            <button
              key={c.key}
              onClick={() => setActivo(c.key)}
              title={comida.nombre}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                activo === c.key ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border"
              }`}
            >
              <span className="text-xl">{comida.emoji}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── ESTADO NUTRICIONAL VIEW ──────────────────────────────────────────────────

function EstadoNutricionalView() {
  const [form, setForm] = useState({ nombre: "", edad: "", peso: "", talla: "" });
  const [resultado, setResultado] = useState<NinoData | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  

  const handleCalc = useCallback(async () => {
    if (!supabase) {
      setStatusMessage("Configura las variables de Supabase para guardar los datos.");
      return;
    }

    const edad = parseFloat(form.edad);
    const peso = parseFloat(form.peso);
    const talla = parseFloat(form.talla);
    const nombre = form.nombre.trim();
    if (!nombre || isNaN(edad) || isNaN(peso) || isNaN(talla)) return;

    const imc = calcularIMC(peso, talla);
    const estado = clasificarIMC(imc, edad);
    const data: NinoData = { nombre, edad, peso, talla, imc, estado };

    setIsSaving(true);
    setStatusMessage(null);

    try {
      setStatusMessage(null);
      const res = await measurementController.saveMeasurementByName(nombre, edad, peso, talla, imc, estado);
      setResultado(data);
      const mapped = (res.history ?? []).map((row: MeasurementRow) => ({
        nombre: res.child.full_name,
        edad: res.child.age_years ?? 0,
        peso: Number(row.weight_kg),
        talla: Number(row.height_cm),
        imc: Number(row.bmi),
        estado: row.bmi_status,
        measured_at: row.measured_at,
        child_id: row.child_id,
      }));
      setHistorial(mapped);
    } catch {
      setStatusMessage("Error guardando la medicion.");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  const chartData = [...historial]
    .reverse()
    .map((item) => ({ mes: formatShortDate(item.measured_at), peso: item.peso, imc: item.imc }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <SectionHeader
        title="Estado Nutricional"
        subtitle="Ingresa los datos del niño o niña para calcular su índice de masa corporal (IMC) y evaluar su estado nutricional."
      />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card>
          <h2 className="font-display font-bold text-lg text-foreground mb-5 flex items-center gap-2">
            <User size={18} className="text-primary" /> Datos del niño/a
          </h2>
          <div className="space-y-4">
            {[
              { key: "nombre", label: "Nombre completo", placeholder: "Ej: Ana Quispe", icon: <User size={15} /> },
              { key: "edad", label: "Edad (años)", placeholder: "Ej: 7", icon: <Calendar size={15} /> },
              { key: "peso", label: "Peso (kg)", placeholder: "Ej: 22.5", icon: <Weight size={15} /> },
              { key: "talla", label: "Talla (cm)", placeholder: "Ej: 118", icon: <Ruler size={15} /> },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{field.icon}</span>
                  <input
                    type={field.key === "nombre" ? "text" : "number"}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 bg-input-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={handleCalc}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Calcular IMC"}
            </button>
            {statusMessage && (
              <p className="text-xs text-muted-foreground">{statusMessage}</p>
            )}
          </div>
        </Card>

        {/* Resultado */}
        <div className="space-y-5">
          {resultado && (
            <Card>
              <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Resultado
              </h2>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Paciente</div>
                  <div className="font-bold text-foreground text-lg">{resultado.nombre}</div>
                  <div className="text-sm text-muted-foreground">{resultado.edad} años · {resultado.peso} kg · {resultado.talla} cm</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${estadoColor(resultado.estado)}`}>
                  {estadoLabel(resultado.estado)}
                </span>
              </div>
              <div className="bg-secondary rounded-xl p-5 text-center">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">IMC</div>
                <div className="font-display text-5xl font-bold text-primary">{resultado.imc}</div>
                <div className="text-sm text-muted-foreground mt-1">kg/m²</div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                {(["bajo_peso", "normal", "sobrepeso", "obesidad"] as NinoData["estado"][]).map((e) => (
                  <div
                    key={e}
                    className={`py-1.5 rounded-lg border ${resultado.estado === e ? estadoColor(e) : "border-border text-muted-foreground"}`}
                  >
                    {estadoLabel(e)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Plan alimentario */}
          {resultado && <PlanAlimentario estado={resultado.estado} />}

          {/* Gráfico evolución */}
          <Card>
            <h2 className="font-display font-bold text-base text-foreground mb-4">Evolucion de IMC</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay historial suficiente para mostrar la grafica.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,26,14,0.08)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#7A6652" }} />
                  <YAxis domain={[14, 30]} tick={{ fontSize: 11, fill: "#7A6652" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "rgba(44,26,14,0.1)" }} />
                  <Line type="monotone" dataKey="imc" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-primary)" }} name="IMC" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-bold text-lg text-foreground mb-4">Registros recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Nombre", "Edad", "Peso", "Talla", "IMC", "Estado"].map((h) => (
                    <th key={h} className="pb-3 pr-4 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((n, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-foreground">{n.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{n.edad} años</td>
                    <td className="py-3 pr-4 text-muted-foreground">{n.peso} kg</td>
                    <td className="py-3 pr-4 text-muted-foreground">{n.talla} cm</td>
                    <td className="py-3 pr-4 font-mono font-medium text-foreground">{n.imc}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estadoColor(n.estado)}`}>
                        {estadoLabel(n.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EDUCACIÓN VIEW ───────────────────────────────────────────────────────────

function EducacionView() {
  const [juegoActivo, setJuegoActivo] = useState<number | null>(null);
  const [tips, setTips] = useState<TipRow[]>([]);
  const [comparisons, setComparisons] = useState<FoodComparisonRow[]>([]);
  const [games, setGames] = useState<EducationGameRow[]>([]);
  const [educationError, setEducationError] = useState<string | null>(supabase ? null : "Configura las variables de Supabase para cargar contenido educativo.");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const load = async () => {
      try {
        const content = await (await import("./controllers/educationController")).loadEducationContent();
        if (!cancelled) {
          setTips(content.tips ?? []);
          setComparisons(content.comparisons ?? []);
          setGames(content.games ?? []);
        }
      } catch {
        if (!cancelled) setEducationError("No se pudo cargar el contenido educativo.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const gameColors = [
    "bg-accent/10 border-accent/20",
    "bg-primary/10 border-primary/20",
    "bg-amber-100 border-amber-200",
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <SectionHeader
        title="Educación Nutricional"
        subtitle="Recursos para padres, docentes y niños sobre alimentación saludable con enfoque en productos locales bolivianos."
      />

      {/* Tips padres */}
      <section>
        <h2 className="font-display font-bold text-xl text-foreground mb-5 flex items-center gap-2">
          <Apple size={20} className="text-accent" /> Tips para padres
        </h2>
        {tips.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay tips publicados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map((tip, i) => (
              <div key={tip.id} className="bg-card border border-border rounded-xl p-5 flex gap-3">
                <span className="text-accent font-mono font-bold text-sm shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm text-foreground leading-relaxed">{tip.tip}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comparativas */}
      <section>
        <h2 className="font-display font-bold text-xl text-foreground mb-2 flex items-center gap-2">
          <Zap size={20} className="text-primary" /> Comparativa de alimentos locales
        </h2>
        <p className="text-muted-foreground text-sm mb-6">Por porción de 100g / 200ml</p>
        {comparisons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay comparativas publicadas.</p>
        ) : (
          <div className="space-y-5">
            {comparisons.map((cmp) => {
              const chartData = [
                { nombre: "Calorias", a: cmp.local_calories ?? 0, b: cmp.processed_calories ?? 0 },
                { nombre: "Proteinas", a: cmp.local_protein ?? 0, b: cmp.processed_protein ?? 0 },
                { nombre: "Azucar (g)", a: cmp.local_sugar ?? 0, b: cmp.processed_sugar ?? 0 },
              ];
              return (
                <Card key={cmp.id}>
                  <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center justify-around text-center">
                      <div className="space-y-1">
                        <div className="text-4xl">{cmp.local_emoji ?? "🍲"}</div>
                        <div className="font-bold text-foreground text-sm">{cmp.local_name}</div>
                        <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full border border-accent/20">Local ✓</span>
                      </div>
                      <div className="text-muted-foreground font-bold text-lg">vs</div>
                      <div className="space-y-1">
                        <div className="text-4xl">{cmp.processed_emoji ?? "🥤"}</div>
                        <div className="font-bold text-foreground text-sm">{cmp.processed_name}</div>
                        <span className="inline-block bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full border border-destructive/20">Procesado</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,26,14,0.08)" />
                        <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "#7A6652" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#7A6652" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="a" name={cmp.local_name} fill="#4A7C59" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="b" name={cmp.processed_name} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Juegos educativos */}
      <section>
        <h2 className="font-display font-bold text-xl text-foreground mb-5">🎮 Dinámicas educativas</h2>
        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay dinamicas publicadas.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {games.map((game, i) => (
              <div
                key={game.id}
                className={`border rounded-xl p-5 cursor-pointer transition-all ${gameColors[i % gameColors.length]} ${juegoActivo === i ? "ring-2 ring-primary/40 shadow-md" : "hover:shadow-sm"}`}
                onClick={() => setJuegoActivo(juegoActivo === i ? null : i)}
              >
                <div className="text-3xl mb-3">{game.icon_emoji ?? "🎲"}</div>
                <h3 className="font-display font-bold text-foreground mb-2">{game.title}</h3>
                {juegoActivo === i && (
                  <p className="text-sm text-foreground/80 leading-relaxed mt-2 border-t border-border/50 pt-3">{game.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                  {juegoActivo === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {juegoActivo === i ? "Ocultar" : "Ver descripcion"}
                </div>
              </div>
            ))}
          </div>
        )}
        {educationError && (
          <p className="text-xs text-muted-foreground mt-3">{educationError}</p>
        )}
      </section>
    </div>
  );
}

// ─── MONITOREO VIEW ───────────────────────────────────────────────────────────

function MonitoreoView() {
  const [filtro, setFiltro] = useState<NinoData["estado"] | "todos">("todos");
  const [latest, setLatest] = useState<LatestMeasurementRow[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<{ semana: string; normal: number; riesgo: number }[]>([]);
  const [reportLabel, setReportLabel] = useState<string>("");
  const [monitoreoError, setMonitoreoError] = useState<string | null>(supabase ? null : "Configura las variables de Supabase para ver reportes.");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const loadMonitoreo = async () => {
      try {
        const { latest } = await measurementController.loadLatestAndCounts();
        const now = new Date();
        const reportStart = new Date();
        reportStart.setDate(now.getDate() - 27);
        reportStart.setHours(0, 0, 0, 0);

        const reportData = await measurementController.getMeasurementsSince(reportStart.toISOString());

        const buckets = [0, 1, 2, 3].map((index) => ({
          semana: `Sem ${index + 1}`,
          normal: 0,
          riesgo: 0,
        }));

        (reportData ?? []).forEach((row: { bmi_status: string; measured_at?: string }) => {
          const measuredAt = new Date(row.measured_at);
          const diffMs = measuredAt.getTime() - reportStart.getTime();
          const weekIndex = Math.min(3, Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))));
          if (row.bmi_status === "normal") buckets[weekIndex].normal += 1;
          else buckets[weekIndex].riesgo += 1;
        });

        if (!cancelled) {
          setLatest((latest ?? []) as LatestMeasurementRow[]);
          setMonthlyReport(buckets);
          setReportLabel(now.toLocaleDateString("es-BO", { month: "long", year: "numeric" }));
        }
      } catch {
        if (!cancelled) setMonitoreoError("No se pudo cargar el reporte mensual.");
      }
    };

    loadMonitoreo();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapped = latest.map((row) => ({
    nombre: row.full_name,
    edad: row.age_years ?? 0,
    peso: Number(row.weight_kg),
    talla: Number(row.height_cm),
    imc: Number(row.bmi),
    estado: row.bmi_status,
  }));

  const filtrados = filtro === "todos" ? mapped : mapped.filter((n) => n.estado === filtro);
  const enRiesgo = mapped.filter((n) => n.estado !== "normal");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <SectionHeader
        title="Monitoreo Escolar"
        subtitle="Reportes de seguimiento nutricional por grado y alertas de riesgo para docentes y profesionales de salud."
      />

      {/* Alertas */}
      {enRiesgo.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="font-semibold text-amber-800">
              {enRiesgo.length} niños requieren atención nutricional
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {enRiesgo.map((n) => (
              <span
                key={n.nombre}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${estadoColor(n.estado)}`}
              >
                {n.nombre} — {estadoLabel(n.estado)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tabla de niños */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-foreground">Listado de estudiantes</h2>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="text-sm bg-input-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="todos">Todos</option>
              <option value="normal">Normal</option>
              <option value="bajo_peso">Bajo Peso</option>
              <option value="sobrepeso">Sobrepeso</option>
              <option value="obesidad">Obesidad</option>
            </select>
          </div>
          <div className="divide-y divide-border/50">
            {filtrados.length === 0 ? (
              <div className="px-5 py-4 text-sm text-muted-foreground">No hay estudiantes registrados.</div>
            ) : (
              filtrados.map((n) => (
                <div key={n.nombre} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-medium text-sm text-foreground">{n.nombre}</div>
                    <div className="text-xs text-muted-foreground">{n.edad} años · IMC: <span className="font-mono">{n.imc}</span></div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${estadoColor(n.estado)}`}>
                    {estadoLabel(n.estado)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Reporte mensual */}
        <div className="space-y-5">
          <Card>
            <h2 className="font-display font-bold text-base text-foreground mb-4">
              Reporte mensual — {reportLabel || "Sin datos"}
            </h2>
            {monthlyReport.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos suficientes para el reporte.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyReport} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,26,14,0.08)" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#7A6652" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#7A6652" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="normal" name="Estado normal" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="riesgo" name="En riesgo" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-bold text-base text-foreground mb-4">Exportar datos</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Genera un reporte para compartir con médicos u ONGs.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { formato: "CSV", desc: "Para planillas", icono: "📊" },
                { formato: "PDF", desc: "Informe formal", icono: "📄" },
              ].map((exp) => (
                <button
                  key={exp.formato}
                  className="flex items-center gap-3 bg-secondary border border-border rounded-lg px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all text-left"
                >
                  <Download size={16} className="text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-foreground">{exp.icono} {exp.formato}</div>
                    <div className="text-xs text-muted-foreground">{exp.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {monitoreoError && (
        <p className="text-xs text-muted-foreground">{monitoreoError}</p>
      )}
    </div>
  );
}

// ─── CONTACTO VIEW ────────────────────────────────────────────────────────────

function ContactoView() {
  const [faqAbierto, setFaqAbierto] = useState<number | null>(null);
  const [faqsData, setFaqsData] = useState<FaqRow[]>([]);
  const [guidesData, setGuidesData] = useState<GuideRow[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfoRow[]>([]);
  const [contactError, setContactError] = useState<string | null>(supabase ? null : "Configura las variables de Supabase para cargar la informacion.");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const load = async () => {
      try {
        const content = await (await import("./controllers/contactController")).loadContactContent();
        if (!cancelled) {
          setFaqsData(content.faqs ?? []);
          setGuidesData(content.guides ?? []);
          setContactInfo(content.info ?? []);
        }
      } catch {
        if (!cancelled) setContactError("No se pudo cargar la informacion de contacto.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <SectionHeader
        title="Contacto y Soporte"
        subtitle="Preguntas frecuentes, información institucional y guías rápidas para familias."
      />

      <div className="grid lg:grid-cols-2 gap-10">
        {/* FAQ */}
        <section>
          <h2 className="font-display font-bold text-xl text-foreground mb-5">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {faqsData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay preguntas publicadas.</p>
            ) : (
              faqsData.map((faq, i) => (
                <div key={faq.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}
                  >
                    <span className="font-medium text-sm text-foreground">{faq.question}</span>
                    {faqAbierto === i ? (
                      <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {faqAbierto === i && (
                    <div className="px-5 pb-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground leading-relaxed pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Info institucional */}
          <Card>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Información institucional</h2>
            <div className="space-y-3 text-sm">
              {contactInfo.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay informacion institucional publicada.</p>
              ) : (
                contactInfo.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Guías rápidas */}
          <Card>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Guías rápidas para familias</h2>
            <div className="space-y-2">
              {guidesData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay guias publicadas.</p>
              ) : (
                guidesData.map((guia) => (
                  <a
                    key={guia.id}
                    href={guia.url ?? "#"}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <span className="text-xl">{guia.emoji ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{guia.title}</div>
                      <div className="text-xs text-muted-foreground">{guia.type}</div>
                    </div>
                    <Download size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
      {contactError && (
        <p className="text-xs text-muted-foreground">{contactError}</p>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>("inicio");

  const handleNavigate = useCallback((page: PageKey) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const creator = pageFactory[currentPage];
  const pageContent = creator.renderPage({ onNavigate: handleNavigate });

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        h1, h2, h3, h4, .font-display { font-family: 'Roboto Slab', serif; }
        .font-mono { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 6px; height: 6px; opacity: 0; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(44,26,14,0.2); border-radius: 3px; }
        * { scrollbar-width: thin; scrollbar-color: rgba(44,26,14,0.2) transparent; }
      `}</style>
      <Navbar current={currentPage} onNavigate={handleNavigate} />
      <main>{pageContent}</main>
      <footer className="border-t border-border bg-card mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>🌽 NutriBolivia — Seguimiento Nutricional Infantil</span>
          <span>© 2025 · Ministerio de Salud Bolivia</span>
        </div>
      </footer>
    </div>
  );
}

export type DosingEntry = {
  name: string;
  category: string;
  whatItIs: string;
  mechanism: string[];
  focus: string[];
  dose: string[];
  schedule: string[];
  observations: string;
};

export const DOSING_CATEGORIES = [
  "Metabolic",
  "Growth Hormone",
  "Recovery",
  "Cognitive",
  "Cosmetic",
  "Cellular",
] as const;

export const DOSING_GUIDE: DosingEntry[] = [
  {
    name: "Retatrutide",
    category: "Metabolic",
    whatItIs:
      "A synthetic GLP-1/GIP/Glucagon receptor triple agonist in clinical development. It activates three hormonal pathways involved in metabolic regulation at once.",
    mechanism: [
      "GLP-1 receptor: enhances glucose-dependent insulin secretion, slows gastric emptying, reduces hepatic glucose production",
      "GIP receptor: regulates postprandial glucose and fat metabolism; modulates appetite signaling",
      "Glucagon receptor: increases energy expenditure and fat oxidation in targeted tissues",
    ],
    focus: ["Metabolic regulation", "Appetite signaling", "Body composition"],
    dose: ["Range: 0.5–5 mg weekly", "Administration: subcutaneous injection", "Duration: 12–48 week protocols typical"],
    schedule: [
      "Once-weekly dosing on a consistent day",
      "Escalation: 0.5 → 1 → 1.5 → 2.5 → 5 mg weekly over 4–16 weeks",
      "Measurements at baseline, weeks 4, 8, 16, 24",
    ],
    observations:
      "Dose-dependent improvements in body weight, fasting glucose, HbA1c, and triglyceride profiles. Triple agonism enhances fat oxidation while supporting satiety and glucose control.",
  },
  {
    name: "GHK-Cu",
    category: "Cosmetic",
    whatItIs:
      "A naturally occurring copper-complexed tripeptide that acts as a tissue remodeling agent targeting extracellular matrix synthesis and wound healing pathways.",
    mechanism: [
      "Collagen synthesis: stimulates Type I and III collagen via fibroblast signaling",
      "Growth factor signaling: upregulates TGF-β and other reparative cytokines",
      "Angiogenesis: promotes blood vessel formation in repair zones",
      "Antioxidant activity: copper cofactor enhances superoxide dismutase activity",
    ],
    focus: ["Skin remodeling", "Collagen production", "Tissue repair", "Hair health"],
    dose: ["Range: 1–2 mg", "Administration: topical or subcutaneous", "Duration: 8–24 week protocols typical"],
    schedule: ["Daily dosing for optimal collagen stimulation", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Increases skin elasticity, reduces fine lines, and accelerates wound closure. Hair follicle proliferation observed within 4–8 weeks in preliminary studies.",
  },
  {
    name: "MT-1 (Melanotan I)",
    category: "Cosmetic",
    whatItIs:
      "A synthetic analog of α-melanocyte-stimulating hormone that activates melanocortin-1 receptors on melanocytes to increase melanin production.",
    mechanism: [
      "MC1R activation: stimulates melanin synthesis via cAMP signaling",
      "Melanin distribution: increases granule production and melanosomal transfer",
      "Photoprotection: enhanced melanin may support UV defense pathways",
      "Systemic signaling: modulates feeding behavior and sexual function via MC4R",
    ],
    focus: ["Melanin production", "Skin pigmentation", "Photoprotection research"],
    dose: ["Range: 0.25–2 mg", "Administration: subcutaneous injection", "Duration: 4–12 week cycles typical"],
    schedule: ["Daily dosing for sustained melanin upregulation", "Assessments at baseline, weeks 2, 4, 8, 12"],
    observations:
      "Skin darkening visible within 3–7 days with dose-dependent pigmentation changes. Dose-dependent appetite and sexual function modulation through off-target MC4R activity.",
  },
  {
    name: "MT-2 (Melanotan II)",
    category: "Cosmetic",
    whatItIs:
      "A potent, non-selective melanocortin receptor agonist. It activates multiple melanocortin pathways with broader systemic effects than MT-1.",
    mechanism: [
      "MC1R activation: drives melanin synthesis with greater potency than MT-1",
      "MC3R/MC4R activation: affects appetite, energy expenditure, and sexual function",
      "MC5R signaling: modulates sebaceous gland activity and skin barrier function",
      "Broad melanocortin engagement creates metabolic and behavioral changes",
    ],
    focus: ["Melanin production", "Skin pigmentation", "Systemic melanocortin signaling"],
    dose: [
      "Days 1–3: 0.25 mg daily",
      "Days 4–21: 0.5 mg daily",
      "Maintenance: 0.5 mg 1–2× per week",
      "Administration: subcutaneous injection",
    ],
    schedule: [
      "Escalate: 0.25 mg for 3 days, then 0.5 mg for steady state",
      "Then maintenance at 1–2× weekly",
      "Assessments at baseline, weeks 1, 2, 4, 8, 12",
    ],
    observations:
      "Rapid pigmentation onset (24–48 hours). Potent appetite suppression and sexual function enhancement observed. Higher off-target activity than MT-1 requires careful dose management.",
  },
  {
    name: "Glutathione",
    category: "Cellular",
    whatItIs:
      "A naturally occurring tripeptide (γ-glutamyl-cysteinyl-glycine) and the body's master antioxidant, buffering oxidative stress across cellular compartments.",
    mechanism: [
      "Redox buffering: neutralizes hydrogen peroxide and lipid peroxides via glutathione peroxidase",
      "Heavy metal chelation: binds and helps excrete mercury, cadmium, other xenobiotics",
      "Immune support: maintains T-cell and NK cell function",
      "Mitochondrial defense: protects the electron transport chain from free radicals",
    ],
    focus: ["Antioxidant activity", "Oxidative stress reduction", "Cellular health"],
    dose: ["Range: 100–600 mg", "Administration: intravenous, intranasal, or oral", "Duration: 8–24 week protocols typical"],
    schedule: ["1–3 times per week for sustained redox buffering", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Reduces oxidative stress biomarkers (MDA, 8-OHdG) within 2–4 weeks. Improves energy levels and skin appearance in preliminary research; effect is dose- and frequency-dependent.",
  },
  {
    name: "Semax",
    category: "Cognitive",
    whatItIs:
      "A synthetic heptapeptide derived from ACTH(4-10), studied as a nootropic for cognitive and neuroprotective function.",
    mechanism: [
      "BDNF signaling: upregulates brain-derived neurotrophic factor for neuroplasticity",
      "Neuroprotection: enhances antioxidant defenses, reduces neuroinflammation",
      "Monoamine modulation: influences dopamine and noradrenaline for attention and focus",
      "Hippocampal function: supports long-term potentiation for memory consolidation",
    ],
    focus: ["Cognitive performance", "Focus and concentration", "Memory formation", "Neuroplasticity"],
    dose: [
      "Weeks 1–2: 0.5 mg",
      "Weeks 3–8: 0.8 mg",
      "Administration: intranasal spray or subcutaneous",
      "Duration: 8–12 week cycles typical",
    ],
    schedule: [
      "Once or twice daily (protocol-dependent)",
      "Consistent timing for optimal neurochemical effects",
      "Assessments at baseline, weeks 2, 4, 8, 12",
    ],
    observations:
      "Improvements in verbal fluency, reaction time, and memory recall within 2–4 weeks. Neuroprotective benefits persist beyond active dosing.",
  },
  {
    name: "Selank",
    category: "Cognitive",
    whatItIs:
      "A synthetic heptapeptide derived from tuftsin that regulates stress response and mood through neuropeptidergic pathways.",
    mechanism: [
      "GABA signaling: enhances GABAergic neurotransmission, reducing anxiety",
      "Serotonin modulation: influences 5-HT receptor sensitivity and reuptake",
      "Immune regulation: modulates lymphocyte proliferation and IL-6/TNF-α balance",
      "HPA axis tuning: regulates cortisol response",
    ],
    focus: ["Stress response", "Mood regulation", "Cognitive function"],
    dose: ["Range: 100–900 mcg", "Administration: intranasal spray or subcutaneous", "Duration: 12–24 week protocols typical"],
    schedule: ["1–3 times daily for anxiolytic and stress-buffering effects", "Assessments at baseline, weeks 2, 4, 8, 12, 24"],
    observations:
      "Rapid anxiolytic onset (2–4 hours) with sustained mood improvement over weeks. Immune markers modulate within 4 weeks. Synergistic with Semax in dual-peptide protocols.",
  },
  {
    name: "BPC-157",
    category: "Recovery",
    whatItIs:
      "A 15-amino acid synthetic peptide derived from protective compounds in gastric juice — a multipotent tissue repair and neuroprotective agent.",
    mechanism: [
      "Angiogenesis: stimulates vessel growth via VEGF and angiopoietin signaling",
      "Growth factor upregulation: increases FGF, HGF, and GDNF expression",
      "Gut barrier integrity: strengthens tight junctions, enhances mucus layer",
      "Neuroprotection: modulates dopaminergic/serotonergic systems, promotes axonal growth",
    ],
    focus: ["Tendon and ligament repair", "Muscle tissue repair", "Gut health", "Multi-system tissue repair"],
    dose: ["Range: 200–500 mcg", "Administration: subcutaneous or oral", "Duration: 12–24 week protocols typical"],
    schedule: ["1–2 times daily for sustained repair signaling", "Assessments at baseline, weeks 2, 4, 8, 12, 24"],
    observations:
      "Accelerated tendon and ligament healing (visible on ultrasound within 4–8 weeks). Improved gut barrier function. Synergistic with TB-500 in dual-peptide repair protocols.",
  },
  {
    name: "CJC-1295 + Ipamorelin",
    category: "Growth Hormone",
    whatItIs:
      "CJC-1295 is a 30-amino acid GHRH analog; Ipamorelin is a pentapeptide ghrelin receptor agonist. Combined they create synergistic GH secretion via dual GHRH/GHRP pathways.",
    mechanism: [
      "GHRH signaling (CJC-1295): stimulates pituitary GHRH receptors, increasing GH pulse amplitude",
      "GHRP signaling (Ipamorelin): increases GH pulse frequency, blunts somatostatin inhibition",
      "Synergistic release: dual-pathway activation exceeds either peptide alone",
      "Extended activity: DAC variant extends half-life for sustained plus pulsatile GH release",
    ],
    focus: ["Growth hormone signaling", "Recovery and tissue repair", "Sleep quality", "Body composition"],
    dose: ["Range: 0.6–2 mg combined", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: [
      "Daily dosing",
      "5 days on / 2 days off (pulse protocol to prevent desensitization)",
      "Assessments at baseline, weeks 4, 8, 12, 16, 24",
    ],
    observations:
      "Elevated serum IGF-1 and GH within 2–4 weeks. Improved sleep architecture (more REM/deep sleep). Recovery and body composition shifts visible at 8–12 weeks.",
  },
  {
    name: "KLOW Blend",
    category: "Recovery",
    whatItIs:
      "A multi-peptide blend for synergistic recovery, skin health, and inflammation support — typically BPC-157, KPV, TB-500, and other repair-focused peptides.",
    mechanism: [
      "Multi-target repair: angiogenic (BPC-157, TB-500), anti-inflammatory (KPV), neuroprotective pathways",
      "Redundant signaling: FGF, HGF, GDNF, VEGF upregulation creates a robust repair cascade",
      "Skin collagen remodeling via fibroblast stimulation",
      "Systemic anti-inflammation: IL-6 and TNF-α modulation",
    ],
    focus: ["Multi-target recovery", "Skin health and collagen remodeling", "Inflammation reduction"],
    dose: ["Range: 2–6 mg total blend content", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: ["Daily dosing for sustained multi-pathway activation", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Superior outcomes vs single-peptide protocols in recovery, skin texture, and inflammation markers. Synergistic effects visible at 8–12 weeks.",
  },
  {
    name: "MOTS-c",
    category: "Cellular",
    whatItIs:
      "A 16-amino acid mitochondrial-derived peptide that regulates cellular metabolism and metabolic stress responses.",
    mechanism: [
      "AMPK activation: enhances cellular energy production",
      "Glucose homeostasis: improves insulin sensitivity in muscle and adipose",
      "Mitochondrial efficiency: enhances ATP production and oxidative phosphorylation",
      "Exercise adaptation: upregulates PGC-1α and SIRT3",
    ],
    focus: ["Cellular energy metabolism", "Mitochondrial function", "Exercise adaptation"],
    dose: ["Range: 5 mg", "Administration: subcutaneous injection", "Duration: extended cycles (months)"],
    schedule: [
      "Every 5 days",
      "20 days on / minimum 4 months off (cycling prevents tachyphylaxis)",
      "Assessments at baseline, weeks 2, 4, 8, 12, 24",
    ],
    observations:
      "Enhanced aerobic capacity and endurance within 2–4 weeks. Improved fasting glucose and insulin sensitivity at 8–12 weeks. Cycling is essential for sustained efficacy.",
  },
  {
    name: "NAD+",
    category: "Cellular",
    whatItIs:
      "A coenzyme essential to cellular energy production, DNA repair, and stress response signaling. Research formulations enhance NAD+ synthesis or delivery.",
    mechanism: [
      "Mitochondrial ATP production: electron acceptor and cofactor for Complex I–IV",
      "Sirtuin activation: NAD+-dependent deacetylases regulate metabolic and stress pathways",
      "DNA repair: PARPs require NAD+ as substrate",
      "Circadian regulation: NAD+ fluctuation synchronizes clock genes",
    ],
    focus: ["Cellular energy production", "Mitochondrial function", "Longevity pathways"],
    dose: ["Range: 25–100 mg", "Administration: intravenous, intranasal, or oral", "Duration: 12–24 week protocols typical"],
    schedule: ["Twice per week for sustained NAD+ elevation", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Improved energy and cognitive clarity within 1–2 weeks. Enhanced recovery and endurance at 4–8 weeks. Oxidative stress and DNA damage biomarkers improve within 8 weeks.",
  },
  {
    name: "GHRP-6",
    category: "Growth Hormone",
    whatItIs:
      "A hexapeptide ghrelin receptor agonist that stimulates GH secretion via non-GHRH pathways and modulates appetite through ghrelin mimicry.",
    mechanism: [
      "Ghrelin receptor agonism: activates GHS-R1a in the hypothalamic arcuate nucleus",
      "GH pulse enhancement: increases pulse frequency while modulating amplitude",
      "Appetite stimulation: central and peripheral ghrelin activation increases feeding drive",
      "GI motility: enhances gastric motility and digestive function",
    ],
    focus: ["Growth hormone release", "Appetite signaling", "Digestive function support"],
    dose: ["Range: 100–200 mcg", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: ["2–3 times daily for sustained GH pulse support", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Elevated serum GH and IGF-1 within 2–4 weeks. Increased appetite and food intake correlates with GH elevation. Recovery markers accumulate at 8–12 weeks.",
  },
  {
    name: "IGF-1 LR3",
    category: "Growth Hormone",
    whatItIs:
      "A synthetic 83-amino acid analog of endogenous IGF-1 with enhanced potency and extended half-life from its N-terminal long arginine extension.",
    mechanism: [
      "IGF-1R agonism: activates receptors on muscle, bone, and metabolic tissues",
      "mTOR signaling: stimulates mTORC1-dependent protein synthesis and hypertrophy",
      "Myogenesis: promotes satellite cell proliferation and myoblast differentiation",
      "Systemic metabolic effects: enhances glucose uptake, lipolysis, and recovery signaling",
    ],
    focus: ["Muscle growth", "Recovery and tissue repair", "Cellular proliferation"],
    dose: ["Range: 20–50 mcg", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: ["Daily dosing for sustained IGF-1 signaling", "Assessments at baseline, weeks 2, 4, 8, 12, 24"],
    observations:
      "Rapid muscle protein synthesis onset (24–48 hours). Enhanced recovery from training stress. Visible hypertrophy within 4–8 weeks.",
  },
  {
    name: "5-Amino-1MQ",
    category: "Metabolic",
    whatItIs:
      "A small-molecule NNMT inhibitor and peptide-adjacent research compound that modulates NAD+ metabolism and mitochondrial function.",
    mechanism: [
      "NNMT inhibition: preserves NAD+ availability by blocking nicotinamide conversion",
      "NAD+ elevation: drives sirtuin and PARP activity",
      "Mitochondrial efficiency: enhances ATP production and metabolic flexibility",
      "Brown adipose activation: thermogenic uncoupling raises energy expenditure",
    ],
    focus: ["Fat metabolism", "Body composition", "Metabolic flexibility"],
    dose: ["Range: 2.5–5 mg", "Administration: oral or subcutaneous", "Duration: 12–24 week protocols typical"],
    schedule: ["1–2 times daily for sustained NAD+ elevation", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Enhanced fat oxidation and weight loss within 2–4 weeks. Improved insulin sensitivity. Elevated energy expenditure and thermogenesis at 8–12 weeks.",
  },
  {
    name: "Tesamorelin",
    category: "Growth Hormone",
    whatItIs:
      "A 44-amino acid synthetic GHRH analog — a potent, long-acting GHRH receptor agonist with extended pharmacokinetics.",
    mechanism: [
      "GHRH receptor agonism: stimulates pituitary GH secretion and synthesis",
      "GH pulse amplitude: effect accumulates with repeated dosing",
      "Lipolytic signaling: GH-driven lipolysis, particularly visceral adipose",
      "Extended half-life: sustained GH elevation across dosing intervals",
    ],
    focus: ["Growth hormone stimulation", "Visceral fat reduction", "Body composition remodeling"],
    dose: ["Range: 1 mg", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: [
      "Daily dosing",
      "5 days on / 2 days off (pulse protocol to maintain receptor sensitivity)",
      "Assessments at baseline, weeks 4, 8, 12, 24",
    ],
    observations:
      "Serum GH and IGF-1 elevation within 1–2 weeks. Visceral fat reduction visible at 8–12 weeks with enhanced metabolic rate and recovery.",
  },
  {
    name: "Sermorelin",
    category: "Growth Hormone",
    whatItIs:
      "A 29-amino acid synthetic GHRH analog (GHRH 1-29) — shorter and less potent than Tesamorelin, with rapid onset mimicking endogenous GHRH pulses.",
    mechanism: [
      "GHRH receptor agonism: stimulates pituitary GH release",
      "Pulsatile secretion: short half-life mimics natural GH pulses",
      "GH pulse frequency: enhances frequency and amplitude over time",
      "Cumulative effect: repeated dosing builds endogenous GH reserve",
    ],
    focus: ["Growth hormone stimulation", "Sleep quality and recovery", "Age-related GH decline"],
    dose: ["Range: 300 mcg", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: ["Nightly dosing (aligns with the deep-sleep GH surge)", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Improved sleep quality and deep sleep duration within 1–2 weeks. GH and IGF-1 elevation at 4 weeks. Recovery and body composition shifts at 12–16 weeks.",
  },
  {
    name: "Vitamin B12",
    category: "Cellular",
    whatItIs:
      "An essential water-soluble vitamin (cobalamin) serving as cofactor for methionine synthase and methylmalonyl-CoA mutase.",
    mechanism: [
      "Mitochondrial ATP production: methylmalonyl-CoA mutase catalyzes CoA metabolism",
      "Methionine synthesis: drives methylation for DNA synthesis and neurotransmitters",
      "Red blood cell maturation: supports erythropoiesis and oxygen-carrying capacity",
      "Nervous system function: maintains myelin integrity and neuronal signaling",
    ],
    focus: ["Energy metabolism", "Red blood cell production", "Neurological function support"],
    dose: ["Range: 100 mcg", "Administration: intramuscular, intranasal, or oral", "Duration: 12–24 week protocols typical"],
    schedule: ["Daily dosing for sustained methylation support", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Improved energy and mental clarity within 2–4 weeks. Enhanced oxygen-carrying capacity at 8 weeks. Homocysteine reduction within 4–6 weeks.",
  },
  {
    name: "TB-500",
    category: "Recovery",
    whatItIs:
      "A 43-amino acid peptide (Thymosin Beta-4) with angiogenic, neuroprotective, and myogenic properties for multi-system recovery.",
    mechanism: [
      "Actin polymerization: regulates cytoskeletal remodeling during repair",
      "Angiogenesis: upregulates VEGF and endothelial growth factor pathways",
      "Growth factor expression: increases FGF, HGF, and NGF in repair zones",
      "Myogenesis: promotes satellite cell activation and muscle regeneration",
      "Anti-inflammatory: reduces TNF-α and IL-6",
    ],
    focus: ["Tissue repair and recovery", "Mobility and flexibility", "Multi-system healing"],
    dose: [
      "Starting: 500 mcg",
      "Escalation: increase by 100 mcg every 2 weeks as tolerated",
      "Range: 500–1,000 mcg",
      "Administration: subcutaneous injection",
      "Duration: 12–24 week protocols typical",
    ],
    schedule: ["Daily dosing for sustained repair signaling", "Assessments at baseline, weeks 2, 4, 8, 12, 24"],
    observations:
      "Accelerated recovery from training stress within 1–2 weeks. Joint flexibility improvements at 4–8 weeks. Tendon/ligament healing on ultrasound at 8–12 weeks. Synergistic with BPC-157.",
  },
  {
    name: "KPV",
    category: "Recovery",
    whatItIs:
      "A tripeptide (Lysine-Proline-Valine) derived from α-MSH — a selective MC4R agonist with anti-inflammatory and gut barrier-supporting properties.",
    mechanism: [
      "MC4R agonism: selective activation on immune cells and gut epithelium",
      "Anti-inflammatory: reduces IL-6, TNF-α, and IL-17",
      "Tight junction enhancement: increases claudin and occludin expression",
      "Immune regulation: modulates T-reg differentiation and macrophage polarization",
    ],
    focus: ["Inflammation reduction", "Gut barrier integrity", "Immune modulation"],
    dose: ["Range: 200–500 mcg", "Administration: intranasal spray or oral", "Duration: 12–24 week protocols typical"],
    schedule: ["Daily dosing for sustained barrier and immune support", "Assessments at baseline, weeks 4, 8, 12, 24"],
    observations:
      "Reduced inflammation markers (CRP, TNF-α) within 2–4 weeks. Improved gut barrier function at 4–8 weeks. Synergistic with BPC-157 and KLOW.",
  },
  {
    name: "Wolverine Blend",
    category: "Recovery",
    whatItIs:
      "A multi-peptide blend for aggressive recovery and tissue repair, typically TB-500, BPC-157, and other regenerative peptides in optimized ratios.",
    mechanism: [
      "Multi-pathway repair: actin remodeling (TB-500) plus angiogenic signaling (BPC-157, TB-500)",
      "Redundant regenerative cascades: VEGF, FGF, HGF, NGF",
      "Injury site concentration: targets tendon, ligament, muscle, and systemic recovery",
      "Anti-inflammatory support during tissue remodeling",
    ],
    focus: ["Multi-peptide recovery support", "Tissue repair across systems", "Accelerated healing"],
    dose: ["Range: 250–500 mcg total blend content", "Administration: subcutaneous injection", "Duration: 12–24 week protocols typical"],
    schedule: [
      "Daily dosing for sustained multi-pathway activation",
      "5 days on / 2 days off (pulse protocol)",
      "Assessments at baseline, weeks 4, 8, 12, 24",
    ],
    observations:
      "Superior recovery outcomes vs single-peptide protocols. Joint mobility and tendon integrity improvements at 4–8 weeks. Training capacity gains at 8–12 weeks.",
  },
];

export const DOSING_COMPLIANCE =
  "All compounds listed here are research use only (RUO). This reference is educational and is not medical advice, a prescription, or a recommendation for human or animal use.";

"use client";

import { useState } from "react";

// 의학 약어 사전
const MEDICAL_ABBREVIATIONS: Record<string, string> = {
  "V/S": "Vital Signs (활력징후)",
  "BP": "Blood Pressure (혈압)",
  "HR": "Heart Rate (심박수)",
  "RR": "Respiratory Rate (호흡수)",
  "SpO2": "Oxygen Saturation (산소포화도)",
  "BT": "Body Temperature (체온)",
  "I/O": "Intake/Output (섭취량/배출량)",
  "IV": "Intravenous (정맥주사)",
  "IM": "Intramuscular (근육주사)",
  "SC": "Subcutaneous (피하주사)",
  "PO": "Per Os (경구투여)",
  "PRN": "Pro Re Nata (필요시)",
  "BID": "Bis In Die (1일 2회)",
  "TID": "Ter In Die (1일 3회)",
  "QD": "Quaque Die (1일 1회)",
  "QHS": "Quaque Hora Somni (취침 전)",
  "NPO": "Nil Per Os (금식)",
  "WBC": "White Blood Cell (백혈구)",
  "CRP": "C-Reactive Protein (C반응단백)",
  "BNP": "Brain Natriuretic Peptide (뇌나트륨이뇨펩타이드)",
  "HbA1c": "Glycated Hemoglobin (당화혈색소)",
  "Cr": "Creatinine (크레아티닌)",
  "Na": "Sodium (나트륨)",
  "EKG": "Electrocardiogram (심전도)",
  "ECG": "Electrocardiogram (심전도)",
  "ICU": "Intensive Care Unit (중환자실)",
  "SBAR": "Situation-Background-Assessment-Recommendation",
  "MEWS": "Modified Early Warning Score (조기경고점수)",
  "AF": "Atrial Fibrillation (심방세동)",
  "CTR": "Cardiothoracic Ratio (심흉비)",
  "EF": "Ejection Fraction (박출률)",
  "NYHA": "New York Heart Association (뉴욕심장학회 분류)",
  "DM": "Diabetes Mellitus (당뇨병)",
  "HTN": "Hypertension (고혈압)",
};

function TooltipWord({ word }: { word: string }) {
  const [show, setShow] = useState(false);
  const clean = word.replace(/[.,;:!?()]/g, "");
  const meaning = MEDICAL_ABBREVIATIONS[clean];

  if (!meaning) return <>{word} </>;

  return (
    <span className="relative inline-block">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="border-b border-dashed border-indigo-400 cursor-help text-indigo-700 font-medium"
      >
        {word}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          {meaning}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
      {" "}
    </span>
  );
}

export default function MedicalTooltipText({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span>
      {words.map((word, i) => (
        <TooltipWord key={i} word={word} />
      ))}
    </span>
  );
}

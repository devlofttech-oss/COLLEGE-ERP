import { useMemo, useState } from 'react';
import { Edit3, HeartPulse, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import {
  createEmptyHealthRecord,
  familyHistoryTemplate,
  isHealthRecordManager,
  medicalConditionOptions,
  monthlyRecordYears,
  normalizeHealthRecordForm,
  vaccineStatusFields,
} from '../studentHealthRecordModel';

const inputClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-100';
const textareaClass = 'min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100';
const tableInputClass = 'h-9 min-w-24 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-emerald-100';

function Section({ title, helper, children }) {
  return (
    <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, full = false }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${full ? 'sm:col-span-2 xl:col-span-3' : ''}`}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ReadItem({ label, value, full = false }) {
  return (
    <div className={`rounded-lg bg-[#f5f5f6] p-3 ${full ? 'sm:col-span-2 xl:col-span-3' : ''}`}>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{value || '-'}</div>
    </div>
  );
}

function ReadGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value, full]) => (
        <ReadItem key={label} label={label} value={value} full={full} />
      ))}
    </div>
  );
}

export default function StudentHealthRecordTab({
  academicYear = '',
  canManage = false,
  currentRoleId = '',
  healthRecord = null,
  onDelete,
  onSave,
  student,
}) {
  const manager = canManage || isHealthRecordManager(currentRoleId);
  const normalizedRecord = useMemo(
    () => normalizeHealthRecordForm(healthRecord || {}, student, academicYear),
    [academicYear, healthRecord, student]
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => normalizedRecord);

  const hasRecord = Boolean(healthRecord?.id);
  const identification = form.identification || {};
  const personalHistory = form.personalHistory || {};

  const updateSection = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const updatePersonalVaccination = (key, value) => {
    setForm((prev) => ({
      ...prev,
      personalHistory: {
        ...(prev.personalHistory || {}),
        vaccinations: {
          ...(prev.personalHistory?.vaccinations || {}),
          [key]: value,
        },
      },
    }));
  };

  const toggleCondition = (condition) => {
    setForm((prev) => {
      const selected = prev.personalHistory?.medicalConditions || [];
      const next = selected.includes(condition)
        ? selected.filter((item) => item !== condition)
        : [...selected, condition];
      return {
        ...prev,
        personalHistory: {
          ...(prev.personalHistory || {}),
          medicalConditions: next,
        },
      };
    });
  };

  const updateArrayItem = (section, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: (prev[section] || []).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }));
  };

  const updateMonthlyRecord = (index, yearKey, key, value) => {
    setForm((prev) => ({
      ...prev,
      monthlyRecords: (prev.monthlyRecords || []).map((item, itemIndex) => (
        itemIndex === index
          ? { ...item, [yearKey]: { ...(item[yearKey] || {}), [key]: value } }
          : item
      )),
    }));
  };

  const updateMedicalExam = (index, yearKey, value) => {
    updateArrayItem('medicalExaminations', index, yearKey, value);
  };

  const addSicknessRow = () => {
    setForm((prev) => ({
      ...prev,
      sicknessDetails: [
        ...(prev.sicknessDetails || []),
        { date: '', diagnosis: '', treatment: '', investigation: '', sickDays: '', signature: '' },
      ],
    }));
  };

  const removeSicknessRow = (index) => {
    setForm((prev) => ({
      ...prev,
      sicknessDetails: (prev.sicknessDetails || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!manager || saving) return;
    setSaving(true);
    try {
      const payload = normalizeHealthRecordForm(form, student, academicYear);
      const saved = await onSave?.(payload, healthRecord);
      if (saved !== false) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!manager || !healthRecord?.id) return;
    const confirmed = window.confirm('Delete this student health record?');
    if (!confirmed) return;
    const deleted = await onDelete?.(healthRecord);
    if (deleted !== false) {
      setEditing(false);
      setForm(createEmptyHealthRecord(student, academicYear));
    }
  };

  const renderForm = () => (
    <div className="space-y-5">
      <Section title="Identification Data" helper="Basic student health-record identity details.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['studentName', 'Name of the Student'],
            ['fatherName', "Father's Name"],
            ['academicYear', 'Academic Year'],
            ['rollNo', 'Roll No'],
            ['courseYear', 'Course & Year'],
            ['dateOfBirth', 'Date of Birth'],
            ['age', 'Age'],
            ['gender', 'Gender'],
            ['dateOfAdmission', 'Date of Admission'],
            ['dateOfCompletion', 'Date of Completion'],
            ['emergencyContact', 'Emergency Contact'],
            ['emergencyPhone', 'Emergency Phone No'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input className={inputClass} value={identification[key] || ''} onChange={(event) => updateSection('identification', key, event.target.value)} />
            </Field>
          ))}
          <Field label="Permanent Address" full>
            <textarea className={textareaClass} value={identification.permanentAddress || ''} onChange={(event) => updateSection('identification', 'permanentAddress', event.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Personal History" helper="Medical history, allergies, menstrual history, vaccinations, and sleep history from the PDF.">
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {medicalConditionOptions.map((condition) => (
            <label key={condition} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-100 bg-[#f5f5f6] px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={(personalHistory.medicalConditions || []).includes(condition)}
                onChange={() => toggleCondition(condition)}
              />
              {condition}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['conditionExplanation', 'If any condition is selected, explain', true],
            ['seriousIllnessInjurySurgery', 'Other serious illness, injury or surgery', true],
            ['currentMedications', 'Current medications', true],
            ['confinementTreatment', 'Disease or accident requiring bed confinement/treatment', true],
            ['bloodGroupType', 'Blood group & type', false],
            ['physicalAbnormalities', 'Physical abnormalities or defect', true],
            ['allergies', 'Allergies (Food/Drug/Environmental)', true],
            ['allergyMedicines', 'Medicine for allergies', true],
            ['menstrualHistory', 'Menstrual history', true],
            ['ageOfMenarche', 'Age of Menarche', false],
            ['cycleDuration', 'Cycle Duration', false],
            ['frequency', 'Frequency', false],
            ['painOrDiscomfort', 'Pain or Discomfort', false],
            ['sleepSchedule', 'Schedule of sleep', false],
            ['sleepNormal', 'Normal sleep', false],
            ['sleepDisturbed', 'Disturbed sleep', false],
            ['sleepDisturbanceDetails', 'If disturbed, specify', true],
          ].map(([key, label, full]) => (
            <Field key={key} label={label} full={full}>
              {full ? (
                <textarea className={textareaClass} value={personalHistory[key] || ''} onChange={(event) => updateSection('personalHistory', key, event.target.value)} />
              ) : (
                <input className={inputClass} value={personalHistory[key] || ''} onChange={(event) => updateSection('personalHistory', key, event.target.value)} />
              )}
            </Field>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vaccineStatusFields.map(([key, label]) => (
            <Field key={key} label={`Last vaccinated for ${label}`}>
              <input className={inputClass} value={personalHistory.vaccinations?.[key] || ''} onChange={(event) => updatePersonalVaccination(key, event.target.value)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Immunization History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Vaccine</th>
                <th className="px-3 py-2">Minimum age</th>
                <th className="px-3 py-2">Age received</th>
                <th className="px-3 py-2">Not received</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(form.immunizations || []).map((row, index) => (
                <tr key={row.vaccine} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.vaccine}</td>
                  <td className="px-3 py-2">{row.minimumAge}</td>
                  <td className="px-3 py-2"><input className={tableInputClass} value={row.ageReceived || ''} onChange={(event) => updateArrayItem('immunizations', index, 'ageReceived', event.target.value)} /></td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={Boolean(row.notReceived)} onChange={(event) => updateArrayItem('immunizations', index, 'notReceived', event.target.checked)} />
                  </td>
                  <td className="px-3 py-2"><input className={`${tableInputClass} w-full`} value={row.remarks || ''} onChange={(event) => updateArrayItem('immunizations', index, 'remarks', event.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Family History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Relation</th>
                <th className="px-3 py-2">Age if living</th>
                <th className="px-3 py-2">Disease if any</th>
                <th className="px-3 py-2">Age at death</th>
                <th className="px-3 py-2">Cause of death</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(form.familyHistory || []).map((row, index) => (
                <tr key={row.relation || familyHistoryTemplate[index]} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.relation}</td>
                  {['ageIfLiving', 'disease', 'ageAtDeath', 'causeOfDeath', 'remarks'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input className={`${tableInputClass} w-full`} value={row[key] || ''} onChange={(event) => updateArrayItem('familyHistory', index, key, event.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Final Remarks and Recommendations">
        <textarea className={`${textareaClass} w-full`} value={form.finalRemarks || ''} onChange={(event) => setForm((prev) => ({ ...prev, finalRemarks: event.target.value }))} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['semester1And2', '1st & 2nd Semester Coordinator'],
            ['semester3And4', '3rd & 4th Semester Coordinator'],
            ['semester5And6', '5th & 6th Semester Coordinator'],
            ['semester7And8', '7th & 8th Semester Coordinator'],
            ['principal', 'Principal'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input className={inputClass} value={form.coordinatorSignatures?.[key] || ''} onChange={(event) => updateSection('coordinatorSignatures', key, event.target.value)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Sickness Details" helper="Add as many sickness rows as required.">
        <div className="space-y-3">
          {(form.sicknessDetails || []).map((row, index) => (
            <div key={`${index}-${row.date}`} className="grid gap-3 rounded-lg border border-slate-100 bg-[#f5f5f6] p-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ['date', 'Date'],
                ['diagnosis', 'Diagnosis'],
                ['treatment', 'Treatment'],
                ['investigation', 'Investigation if any'],
                ['sickDays', 'No. of Sick Days'],
                ['signature', 'Signature'],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input className={inputClass} value={row[key] || ''} onChange={(event) => updateArrayItem('sicknessDetails', index, key, event.target.value)} />
                </Field>
              ))}
              <button type="button" onClick={() => removeSicknessRow(index)} className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 xl:col-span-6">
                Remove Row
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addSicknessRow} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[#33373e] px-4 text-sm font-bold text-white">
          <Plus size={15} /> Add Sickness Row
        </button>
      </Section>

      <Section title="Monthly Record" helper="WT, BP, and LMP by month and year.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Month</th>
                {monthlyRecordYears.map(([key, label]) => (
                  <th key={key} className="px-3 py-2">{label} - WT / BP / LMP</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.monthlyRecords || []).map((row, index) => (
                <tr key={row.month} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.month}</td>
                  {monthlyRecordYears.map(([yearKey]) => (
                    <td key={yearKey} className="px-3 py-2">
                      <div className="flex gap-2">
                        {['wt', 'bp', 'lmp'].map((key) => (
                          <input
                            key={key}
                            className={tableInputClass}
                            placeholder={key.toUpperCase()}
                            value={row[yearKey]?.[key] || ''}
                            onChange={(event) => updateMonthlyRecord(index, yearKey, key, event.target.value)}
                          />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Medical Examination - Investigation">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Physical Finding</th>
                {monthlyRecordYears.map(([key, label]) => (
                  <th key={key} className="px-3 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.medicalExaminations || []).map((row, index) => (
                <tr key={row.finding} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.finding}</td>
                  {monthlyRecordYears.map(([yearKey]) => (
                    <td key={yearKey} className="px-3 py-2">
                      <input className={`${tableInputClass} w-full`} value={row[yearKey] || ''} onChange={(event) => updateMedicalExam(index, yearKey, event.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );

  const renderReadMode = () => (
    <div className="space-y-5">
      <Section title="Identification Data">
        <ReadGrid items={[
          ['Name of the Student', normalizedRecord.identification.studentName],
          ["Father's Name", normalizedRecord.identification.fatherName],
          ['Academic Year', normalizedRecord.identification.academicYear],
          ['Roll No', normalizedRecord.identification.rollNo],
          ['Course & Year', normalizedRecord.identification.courseYear],
          ['Date of Birth', normalizedRecord.identification.dateOfBirth],
          ['Age', normalizedRecord.identification.age],
          ['Gender', normalizedRecord.identification.gender],
          ['Date of Admission', normalizedRecord.identification.dateOfAdmission],
          ['Date of Completion', normalizedRecord.identification.dateOfCompletion],
          ['Emergency Contact', normalizedRecord.identification.emergencyContact],
          ['Emergency Phone No', normalizedRecord.identification.emergencyPhone],
          ['Permanent Address', normalizedRecord.identification.permanentAddress, true],
        ]} />
      </Section>

      <Section title="Personal History">
        <div className="mb-4 rounded-lg bg-[#f5f5f6] p-3">
          <div className="text-xs font-bold text-slate-500">Selected Medical Conditions</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(normalizedRecord.personalHistory.medicalConditions || []).length ? (
              normalizedRecord.personalHistory.medicalConditions.map((condition) => (
                <span key={condition} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{condition}</span>
              ))
            ) : (
              <span className="text-sm font-semibold text-slate-500">None selected</span>
            )}
          </div>
        </div>
        <ReadGrid items={[
          ['Condition explanation', normalizedRecord.personalHistory.conditionExplanation, true],
          ['Serious illness, injury or surgery', normalizedRecord.personalHistory.seriousIllnessInjurySurgery, true],
          ['Current medications', normalizedRecord.personalHistory.currentMedications, true],
          ['Bed confinement/treatment', normalizedRecord.personalHistory.confinementTreatment, true],
          ['Blood group & type', normalizedRecord.personalHistory.bloodGroupType],
          ['Physical abnormalities', normalizedRecord.personalHistory.physicalAbnormalities, true],
          ['Allergies', normalizedRecord.personalHistory.allergies, true],
          ['Medicine for allergies', normalizedRecord.personalHistory.allergyMedicines, true],
          ['Menstrual history', normalizedRecord.personalHistory.menstrualHistory, true],
          ['Age of Menarche', normalizedRecord.personalHistory.ageOfMenarche],
          ['Cycle Duration', normalizedRecord.personalHistory.cycleDuration],
          ['Frequency', normalizedRecord.personalHistory.frequency],
          ['Pain or Discomfort', normalizedRecord.personalHistory.painOrDiscomfort],
          ['Sleep Schedule', normalizedRecord.personalHistory.sleepSchedule],
          ['Normal Sleep', normalizedRecord.personalHistory.sleepNormal],
          ['Disturbed Sleep', normalizedRecord.personalHistory.sleepDisturbed],
          ['Sleep disturbance details', normalizedRecord.personalHistory.sleepDisturbanceDetails, true],
        ]} />
      </Section>

      <Section title="Vaccination Status">
        <ReadGrid items={vaccineStatusFields.map(([key, label]) => [
          label,
          normalizedRecord.personalHistory.vaccinations?.[key],
        ])} />
      </Section>

      <Section title="Immunization History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Vaccine</th>
                <th className="px-3 py-2">Minimum age</th>
                <th className="px-3 py-2">Age received</th>
                <th className="px-3 py-2">Not received</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRecord.immunizations.map((row) => (
                <tr key={row.vaccine} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.vaccine}</td>
                  <td className="px-3 py-2">{row.minimumAge}</td>
                  <td className="px-3 py-2">{row.ageReceived || '-'}</td>
                  <td className="px-3 py-2">{row.notReceived ? 'Yes' : '-'}</td>
                  <td className="px-3 py-2">{row.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Family History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Relation</th>
                <th className="px-3 py-2">Age if living</th>
                <th className="px-3 py-2">Disease if any</th>
                <th className="px-3 py-2">Age at death</th>
                <th className="px-3 py-2">Cause of death</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRecord.familyHistory.map((row) => (
                <tr key={row.relation} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.relation}</td>
                  <td className="px-3 py-2">{row.ageIfLiving || '-'}</td>
                  <td className="px-3 py-2">{row.disease || '-'}</td>
                  <td className="px-3 py-2">{row.ageAtDeath || '-'}</td>
                  <td className="px-3 py-2">{row.causeOfDeath || '-'}</td>
                  <td className="px-3 py-2">{row.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Final Remarks and Recommendations">
        <ReadGrid items={[
          ['Final Remarks', normalizedRecord.finalRemarks, true],
          ['1st & 2nd Semester Coordinator', normalizedRecord.coordinatorSignatures.semester1And2],
          ['3rd & 4th Semester Coordinator', normalizedRecord.coordinatorSignatures.semester3And4],
          ['5th & 6th Semester Coordinator', normalizedRecord.coordinatorSignatures.semester5And6],
          ['7th & 8th Semester Coordinator', normalizedRecord.coordinatorSignatures.semester7And8],
          ['Principal', normalizedRecord.coordinatorSignatures.principal],
        ]} />
      </Section>

      <Section title="Sickness Details">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Diagnosis</th>
                <th className="px-3 py-2">Treatment</th>
                <th className="px-3 py-2">Investigation</th>
                <th className="px-3 py-2">Sick Days</th>
                <th className="px-3 py-2">Signature</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRecord.sicknessDetails.map((row, index) => (
                <tr key={`${index}-${row.date}`} className="border-b border-slate-100">
                  <td className="px-3 py-2">{row.date || '-'}</td>
                  <td className="px-3 py-2">{row.diagnosis || '-'}</td>
                  <td className="px-3 py-2">{row.treatment || '-'}</td>
                  <td className="px-3 py-2">{row.investigation || '-'}</td>
                  <td className="px-3 py-2">{row.sickDays || '-'}</td>
                  <td className="px-3 py-2">{row.signature || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Monthly Record">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Month</th>
                {monthlyRecordYears.map(([key, label]) => (
                  <th key={key} className="px-3 py-2">{label} - WT / BP / LMP</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalizedRecord.monthlyRecords.map((row) => (
                <tr key={row.month} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.month}</td>
                  {monthlyRecordYears.map(([yearKey]) => {
                    const cells = row[yearKey] || {};
                    return (
                      <td key={yearKey} className="px-3 py-2">
                        WT: {cells.wt || '-'} | BP: {cells.bp || '-'} | LMP: {cells.lmp || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Medical Examination - Investigation">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-[#e7e7e9] text-left text-slate-900">
              <tr>
                <th className="px-3 py-2">Physical Finding</th>
                {monthlyRecordYears.map(([key, label]) => (
                  <th key={key} className="px-3 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalizedRecord.medicalExaminations.map((row) => (
                <tr key={row.finding} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-bold">{row.finding}</td>
                  {monthlyRecordYears.map(([yearKey]) => (
                    <td key={yearKey} className="px-3 py-2">{row[yearKey] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );

  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-5 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <HeartPulse size={20} /> Student Health Record
          </h3>
          <p className="mt-1 text-sm text-slate-500">Structured from the Student Health Record PDF.</p>
          {!manager && <p className="mt-1 text-xs font-semibold text-slate-500">Upload, edit, and delete are restricted to Admin and Super Admin.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && manager && !hasRecord && (
            <button type="button" onClick={() => { setForm(createEmptyHealthRecord(student, academicYear)); setEditing(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#033500] px-4 text-sm font-bold text-white">
              <Upload size={16} /> Upload Health Record
            </button>
          )}
          {!editing && manager && hasRecord && (
            <>
              <button type="button" onClick={() => { setForm(normalizedRecord); setEditing(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#33373e] px-4 text-sm font-bold text-white">
                <Edit3 size={16} /> Edit
              </button>
              <button type="button" onClick={handleDelete} className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white">
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
          {editing && (
            <>
              <button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#033500] px-4 text-sm font-bold text-white disabled:opacity-60">
                <Save size={16} /> {hasRecord ? 'Save Changes' : 'Upload Record'}
              </button>
              <button type="button" onClick={() => { setForm(normalizedRecord); setEditing(false); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">
                <X size={16} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {!hasRecord && !editing ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          No student health record has been uploaded for this student yet.
        </div>
      ) : editing ? renderForm() : renderReadMode()}
    </section>
  );
}

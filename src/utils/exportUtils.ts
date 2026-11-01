import { DataRecord, FieldDefinition } from '../types';

export function recordsToCSV(records: DataRecord[], fields: FieldDefinition[], delimiter: string = ','): string {
  if (records.length === 0) return '';

  const headers = fields.map(f => `"${f.label.replace(/"/g, '""')}"`).join(delimiter);
  
  const rows = records.map(record => {
    return fields.map(f => {
      const val = record.values[f.key];
      if (val === undefined || val === null) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(delimiter);
  });

  return [headers, ...rows].join('\n');
}

export function recordsToTSV(records: DataRecord[], fields: FieldDefinition[]): string {
  // TSV is the standard format that pastes cleanly into Google Sheets and Microsoft Excel
  if (records.length === 0) return '';

  const headers = fields.map(f => f.label.replace(/\t/g, ' ')).join('\t');
  
  const rows = records.map(record => {
    return fields.map(f => {
      const val = record.values[f.key];
      if (val === undefined || val === null) return '';
      return String(val).replace(/[\t\n\r]/g, ' ');
    }).join('\t');
  });

  return [headers, ...rows].join('\n');
}

export function recordsToJSON(records: DataRecord[], fields: FieldDefinition[]): string {
  const formatted = records.map(r => {
    const obj: Record<string, any> = {
      _id: r.id,
      _confidence: r.confidence,
      _status: r.status,
    };
    for (const f of fields) {
      obj[f.key] = r.values[f.key] ?? null;
    }
    return obj;
  });
  return JSON.stringify(formatted, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

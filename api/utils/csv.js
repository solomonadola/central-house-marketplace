// Builds a CSV string from a list of columns and row objects. Columns are
// { label, value(row) }; values containing commas, quotes or newlines are
// quoted and escaped per RFC 4180.
const escape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (columns, rows) =>
  [
    columns.map((column) => escape(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escape(column.value(row))).join(',')),
  ].join('\n') + '\n';

// Sets the response up as a file download and sends the CSV.
export const sendCsv = (res, filename, csv) => {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

import { formatBDT, formatDateTime, formatMonthBengali, toBengaliNumerals, getLocalDateString } from './utils';

function formatInlineText(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #1e293b;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #475569;">$1</em>');
}

/**
 * Downloads an HTML layout directly as a PDF file to the user's device,
 * without opening any browser print preview dialog.
 */
async function downloadHtmlAsPdf(fileName: string, bodyContent: string) {
  if (typeof window === 'undefined') return;

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // Create an offscreen wrapper container with clean modern PDF styles
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm A4 standard width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.padding = '32px 28px';
  container.style.fontFamily = "'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.boxSizing = 'border-box';
  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #059669;
        padding-bottom: 12px;
        margin-bottom: 16px;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 700;
        color: #065f46;
        margin: 0;
      }
      .brand-subtitle {
        font-size: 12px;
        color: #64748b;
        margin-top: 3px;
      }
      .meta-box {
        text-align: right;
        font-size: 11px;
        color: #475569;
        line-height: 1.6;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      .stat-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
      }
      .stat-title {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
        margin-bottom: 2px;
      }
      .stat-value {
        font-size: 14px;
        font-weight: 700;
      }
      .stat-income { color: #059669; }
      .stat-expense { color: #e11d48; }
      .stat-net { color: #2563eb; }
      .stat-count { color: #475569; }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 11.5px;
      }
      th {
        background-color: #f1f5f9;
        color: #334155;
        font-weight: 600;
        text-align: left;
        padding: 7px 9px;
        border-bottom: 2px solid #cbd5e1;
      }
      td {
        padding: 7px 9px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      .badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }
      .badge-income { background: #dcfce7; color: #166534; }
      .badge-expense { background: #ffe4e6; color: #9f1239; }
      .badge-transfer { background: #e0f2fe; color: #075985; }

      .footer {
        margin-top: 24px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #94a3b8;
      }
    </style>
    ${bodyContent}
  `;

  document.body.appendChild(container);

  try {
    // Wait briefly for styles/fonts
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Render to high-resolution canvas
    const canvas = await html2canvas(container, {
      scale: 2, // 2x sharp retina scale
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2; // 190 mm
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - margin * 2);

    // Multi-page handling if content is long
    while (heightLeft > 0) {
      position = position - (pdfHeight - margin * 2);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - margin * 2);
    }

    // Direct PDF file download to user's computer/phone!
    const validFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(validFileName);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportTransactionsToPdf(options: {
  transactions: any[];
  selectedMonth: string;
  totalIncome: number;
  totalExpense: number;
  isFamilyView: boolean;
  useBengaliDigits?: boolean;
}) {
  const {
    transactions,
    selectedMonth,
    totalIncome,
    totalExpense,
    isFamilyView,
    useBengaliDigits = false,
  } = options;

  const netBalance = totalIncome - totalExpense;
  const monthTitle =
    selectedMonth === 'ALL'
      ? 'সকল মাসের সার্বিক খতিয়ান'
      : `${formatMonthBengali(selectedMonth, { useBengaliDigits })} এর মাসিক আর্থিক বিবরণী`;

  const rowsHtml = transactions
    .map((t, idx) => {
      const typeLabel =
        t.type === 'INCOME' ? 'আয়' : t.type === 'EXPENSE' ? 'ব্যয়' : 'স্থানান্তর';
      const typeClass =
        t.type === 'INCOME'
          ? 'badge-income'
          : t.type === 'EXPENSE'
          ? 'badge-expense'
          : 'badge-transfer';
      const amountPrefix = t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : '';
      const formattedAmount = `${amountPrefix} ${formatBDT(t.amount, { useBengaliDigits })}`;
      const catName = t.category?.name || (t.type === 'TRANSFER' ? 'স্থানান্তর' : 'সাধারণ');
      const accName = t.toAccount ? `${t.account.name} ➔ ${t.toAccount.name}` : t.account.name;
      const dateTimeStr = formatDateTime(t.date, t.createdAt, { useBengaliDigits });
      const serial = useBengaliDigits ? toBengaliNumerals(idx + 1) : `${idx + 1}`;

      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-size: 11px;">${serial}</td>
          <td style="white-space: nowrap;">${dateTimeStr}</td>
          <td><span class="badge ${typeClass}">${typeLabel}</span></td>
          <td><strong>${catName}</strong></td>
          <td>${accName}</td>
          <td style="font-weight: 700; text-align: right; ${
            t.type === 'INCOME'
              ? 'color: #059669;'
              : t.type === 'EXPENSE'
              ? 'color: #e11d48;'
              : 'color: #0284c7;'
          }">${formattedAmount}</td>
          <td style="color: #475569;">${t.note || '-'}</td>
          <td style="font-size: 11px; color: #64748b;">${t.user?.name || '-'}</td>
        </tr>
      `;
    })
    .join('');

  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">মোট আয়</div>
        <div class="stat-value stat-income">${formatBDT(totalIncome, { useBengaliDigits })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">মোট ব্যয়</div>
        <div class="stat-value stat-expense">${formatBDT(totalExpense, { useBengaliDigits })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">নিট সঞ্চয় / স্থিতি</div>
        <div class="stat-value stat-net">${formatBDT(netBalance, { useBengaliDigits })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">মোট লেনদেন</div>
        <div class="stat-value stat-count">${
          useBengaliDigits ? toBengaliNumerals(transactions.length) : transactions.length
        } টি</div>
      </div>
    </div>
  `;

  const htmlContent = `
    <div class="header">
      <div>
        <h1 class="brand-title">টাকা-পয়সা — লেনদেন খতিয়ান ও হিসাব</h1>
        <div class="brand-subtitle">${monthTitle} • ${
    isFamilyView ? 'পারিবারিক সমন্বিত হিসাব' : 'ব্যক্তিগত হিসাব'
  }</div>
      </div>
      <div class="meta-box">
        <div>প্রস্তুতের তারিখ: <strong>${new Date().toLocaleDateString('bn-BD')}</strong></div>
        <div>প্ল্যাটফর্ম: টাকা-পয়সা ট্র্যাকার</div>
      </div>
    </div>

    ${statsHtml}

    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th>তারিখ ও সময়</th>
          <th>ধরন</th>
          <th>খাত</th>
          <th>অ্যাকাউন্ট</th>
          <th style="text-align: right;">পরিমাণ (BDT)</th>
          <th>নোট</th>
          <th>সদস্য</th>
        </tr>
      </thead>
      <tbody>
        ${
          rowsHtml ||
          '<tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;">কোনো লেনদেনের তথ্য পাওয়া যায়নি</td></tr>'
        }
      </tbody>
    </table>

    <div class="footer">
      <div>টাকা-পয়সা ট্র্যাকার • নির্ভুল আর্থিক খতিয়ান</div>
      <div>স্বয়ংক্রিয়ভাবে ডাউনলোডকৃত PDF রিপোর্ট</div>
    </div>
  `;

  const fileName = `taka_poysa_transactions_${selectedMonth}_${getLocalDateString()}.pdf`;
  await downloadHtmlAsPdf(fileName, htmlContent);
}

export async function exportAiReportToPdf(options: {
  reportContent: string;
  month: string;
  isFamilyView: boolean;
  useBengaliDigits?: boolean;
}) {
  const { reportContent, month, isFamilyView, useBengaliDigits = false } = options;
  const monthTitle = formatMonthBengali(month, { useBengaliDigits });

  // Format markdown content to styled HTML for print
  const lines = reportContent.split('\n');
  const formattedHtml = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height: 8px;"></div>';
      if (trimmed.startsWith('### ')) {
        return `<h3 style="color: #4c1d95; font-size: 16px; margin: 16px 0 8px 0; border-bottom: 2px solid #ede9fe; padding-bottom: 4px;">${trimmed.replace(
          /^###\s+/,
          ''
        )}</h3>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 style="color: #3b0764; font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #ddd6fe; padding-bottom: 6px;">${trimmed.replace(
          /^##\s+/,
          ''
        )}</h2>`;
      }
      if (trimmed.startsWith('> ')) {
        return `<div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 8px 12px; margin: 10px 0; border-radius: 0 6px 6px 0; font-size: 11px; color: #5b21b6;">${formatInlineText(
          trimmed.replace(/^>\s+/, '')
        )}</div>`;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<div style="padding-left: 14px; margin-bottom: 5px; display: flex; gap: 6px;"><span style="color: #7c3aed; font-weight: bold;">•</span><span>${formatInlineText(
          trimmed.substring(2)
        )}</span></div>`;
      }
      const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
      if (numMatch) {
        return `<div style="padding-left: 14px; margin-bottom: 5px; display: flex; gap: 6px;"><span style="color: #7c3aed; font-weight: bold;">${
          numMatch[1]
        }</span><span>${formatInlineText(numMatch[2])}</span></div>`;
      }
      return `<p style="margin: 4px 0 8px 0; line-height: 1.6;">${formatInlineText(trimmed)}</p>`;
    })
    .join('');

  const htmlContent = `
    <div class="header" style="border-bottom-color: #7c3aed;">
      <div>
        <h1 class="brand-title" style="color: #5b21b6;">মাসিক AI আর্থিক মূল্যায়ন ও রিপোর্ট</h1>
        <div class="brand-subtitle">${monthTitle} • ${
    isFamilyView ? 'পারিবারিক সমন্বিত হিসাব' : 'ব্যক্তিগত হিসাব'
  }</div>
      </div>
      <div class="meta-box">
        <div>প্রস্তুতের তারিখ: <strong>${new Date().toLocaleDateString('bn-BD')}</strong></div>
        <div style="color: #7c3aed; font-weight: 600;">টাকা-পয়সা AI ইন্টেলিজেন্স</div>
      </div>
    </div>

    <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 18px; margin-top: 10px; line-height: 1.6;">
      ${formattedHtml}
    </div>

    <div class="footer" style="margin-top: 24px;">
      <div>হিসাব-নিকাশ অ্যালগরিদম ও AI মডেল দ্বারা প্রস্তুতকৃত</div>
      <div>টাকা-পয়সা ফাইনান্সিয়াল অ্যাডভাইজর</div>
    </div>
  `;

  const fileName = `taka_poysa_ai_report_${month}_${getLocalDateString()}.pdf`;
  await downloadHtmlAsPdf(fileName, htmlContent);
}

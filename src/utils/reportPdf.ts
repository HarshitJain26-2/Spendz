import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type {
  Transaction,
  Account,
  Category,
  Friend,
  SplitExpense,
} from '@/types';
import { formatCurrency } from './currency';
import { getUserPersonalExpense } from './calculations';
import { getCategoryEmoji } from '@/components/transaction/CategorySelectorCard';

export interface ReportData {
  title: string;
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  generatedAtStr: string;
  currency: string;
  userName: string;

  // Period metrics
  periodIncome: number;
  periodExpense: number;
  periodNet: number;
  transactionCount: number;

  // Breakdowns
  categoryBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
    count: number;
  }>;

  // Snapshots as of today
  currentAccounts: Array<{
    name: string;
    type: string;
    balance: number;
  }>;
  totalCurrentBalance: number;

  currentFriendBalances: Array<{
    friendName: string;
    balance: number; // positive = owes you, negative = you owe
  }>;

  // Period transactions
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    note: string;
    categoryName: string;
    accountName: string;
    amount: number;
  }>;
}

export function buildReportHtml(data: ReportData): string {
  const hasTransactions = data.transactions.length > 0;
  const hasCategories = data.categoryBreakdown.length > 0;
  const hasFriends = data.currentFriendBalances.length > 0;

  const categoryRows = data.categoryBreakdown
    .map((c) => {
      const emoji = getCategoryEmoji(c.id, c.name);
      return `
        <tr>
          <td><span style="margin-right: 8px;">${emoji}</span><strong>${escapeHtml(c.name)}</strong></td>
          <td style="text-align: right;">${c.count}</td>
          <td style="text-align: right;">${c.percentage.toFixed(1)}%</td>
          <td style="text-align: right; font-weight: 600; color: #111827;">${formatCurrency(c.amount)}</td>
        </tr>
      `;
    })
    .join('');

  const accountRows = data.currentAccounts
    .map(
      (a) => `
        <tr>
          <td><strong>${escapeHtml(a.name)}</strong> <span style="font-size: 11px; color: #6B7280; text-transform: uppercase;">(${escapeHtml(a.type)})</span></td>
          <td style="text-align: right; font-weight: 600; color: ${a.balance >= 0 ? '#10B981' : '#EF4444'};">${formatCurrency(a.balance)}</td>
        </tr>
      `
    )
    .join('');

  const friendRows = data.currentFriendBalances
    .map((f) => {
      const owesYou = f.balance > 0;
      const youOwe = f.balance < 0;
      const statusText = owesYou
        ? 'Owes you'
        : youOwe
        ? 'You owe'
        : 'Settled up';
      const color = owesYou ? '#10B981' : youOwe ? '#EF4444' : '#6B7280';
      return `
        <tr>
          <td><strong>${escapeHtml(f.friendName)}</strong></td>
          <td style="text-align: right; color: ${color}; font-weight: 500;">${statusText}</td>
          <td style="text-align: right; font-weight: 600; color: ${color};">${formatCurrency(Math.abs(f.balance))}</td>
        </tr>
      `;
    })
    .join('');

  const transactionRows = data.transactions
    .map((t) => {
      let typeSign = '-';
      let typeColor = '#EF4444';
      if (t.type === 'income') {
        typeSign = '+';
        typeColor = '#10B981';
      } else if (t.type === 'transfer') {
        typeSign = '⇄ ';
        typeColor = '#6366F1';
      }

      return `
        <tr>
          <td style="white-space: nowrap; color: #6B7280; font-size: 12px;">${formatDateOnly(t.date)}</td>
          <td><strong>${escapeHtml(t.note || 'Untitled')}</strong></td>
          <td><span class="badge">${escapeHtml(t.categoryName)}</span></td>
          <td style="color: #4B5563;">${escapeHtml(t.accountName)}</td>
          <td style="text-align: right; font-weight: 600; color: ${typeColor};">${typeSign}${formatCurrency(t.amount)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Spendz Report - ${escapeHtml(data.periodLabel)}</title>
      <style>
        @page {
          size: A4;
          margin: 16mm 14mm 16mm 14mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1F2937;
          background: #FFFFFF;
          font-size: 13px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #00C9A7;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #111827;
        }
        .brand-accent {
          color: #00C9A7;
        }
        .brand-subtitle {
          font-size: 13px;
          color: #6B7280;
          margin-top: 2px;
          font-weight: 500;
        }
        .report-meta {
          text-align: right;
          font-size: 12px;
          color: #4B5563;
        }
        .report-meta .period-tag {
          display: inline-block;
          background: #ECFDF5;
          color: #059669;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        .metric-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px;
        }
        .metric-label {
          font-size: 11px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }
        .section {
          margin-bottom: 28px;
          page-break-inside: avoid;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 10px;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 6px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-subtitle {
          font-size: 11px;
          color: #6B7280;
          font-style: italic;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #F3F4F6;
          color: #374151;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
          text-align: left;
        }
        td {
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
          vertical-align: middle;
        }
        tr:nth-child(even) td {
          background: #FAFAFA;
        }
        .badge {
          display: inline-block;
          background: #EEF2F6;
          color: #475569;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .empty-box {
          background: #F9FAFB;
          border: 1px dashed #D1D5DB;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #6B7280;
          font-size: 12px;
        }
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .footer {
          margin-top: 32px;
          border-top: 1px solid #E5E7EB;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #9CA3AF;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div>
          <div class="brand-title">SPENDZ<span class="brand-accent">.</span></div>
          <div class="brand-subtitle">Financial Performance & Activity Report</div>
        </div>
        <div class="report-meta">
          <div class="period-tag">${escapeHtml(data.periodLabel)}</div>
          <div><strong>Range:</strong> ${escapeHtml(data.startDateStr)} – ${escapeHtml(data.endDateStr)}</div>
          <div><strong>Generated:</strong> ${escapeHtml(data.generatedAtStr)}</div>
          ${data.userName ? `<div><strong>Prepared for:</strong> ${escapeHtml(data.userName)}</div>` : ''}
        </div>
      </div>

      <!-- Financial Metrics: Selected Period -->
      <div class="summary-grid">
        <div class="metric-card">
          <div class="metric-label">Period Income</div>
          <div class="metric-value" style="color: #10B981;">${formatCurrency(data.periodIncome)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Period Spending</div>
          <div class="metric-value" style="color: #EF4444;">${formatCurrency(data.periodExpense)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Period Net Flow</div>
          <div class="metric-value" style="color: ${data.periodNet >= 0 ? '#10B981' : '#EF4444'};">
            ${formatCurrency(data.periodNet)}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Transactions</div>
          <div class="metric-value">${data.transactionCount}</div>
        </div>
      </div>

      <!-- Spending by Category (Selected Period) -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Spending by Category</span>
          <span class="section-subtitle">Activity for ${escapeHtml(data.periodLabel)}</span>
        </div>
        ${
          hasCategories
            ? `
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style="text-align: right;">Transactions</th>
                  <th style="text-align: right;">Share</th>
                  <th style="text-align: right;">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows}
              </tbody>
            </table>
          `
            : `<div class="empty-box">No spending recorded in this period.</div>`
        }
      </div>

      <!-- Current Snapshot: Accounts & Friends -->
      <div class="two-column">
        <!-- Accounts Snapshot -->
        <div class="section">
          <div class="section-header">
            <span class="section-title">Accounts</span>
            <span class="section-subtitle">Current balance as of today</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th style="text-align: right;">Current Balance</th>
              </tr>
            </thead>
            <tbody>
              ${accountRows}
              <tr style="background: #F3F4F6; font-weight: 700;">
                <td>Total Net Balance</td>
                <td style="text-align: right; color: ${data.totalCurrentBalance >= 0 ? '#10B981' : '#EF4444'};">${formatCurrency(data.totalCurrentBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Friends Balances Snapshot -->
        <div class="section">
          <div class="section-header">
            <span class="section-title">Friend Balances</span>
            <span class="section-subtitle">Current outstanding debt as of today</span>
          </div>
          ${
            hasFriends
              ? `
              <table>
                <thead>
                  <tr>
                    <th>Friend</th>
                    <th style="text-align: right;">Status</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${friendRows}
                </tbody>
              </table>
            `
              : `<div class="empty-box">No active friend debts or pending splits.</div>`
          }
        </div>
      </div>

      <!-- Transactions Log (Selected Period) -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Transactions Log</span>
          <span class="section-subtitle">${data.transactions.length} record(s) in selected period</span>
        </div>
        ${
          hasTransactions
            ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / Note</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${transactionRows}
              </tbody>
            </table>
          `
            : `<div class="empty-box">No transactions found for the selected period.</div>`
        }
      </div>

      <!-- Footer -->
      <div class="footer">
        <div>Spendz · Local-First Finance Management</div>
        <div>Confidential · Generated directly from on-device database</div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return isoString;
  }
}

/**
 * Cross-platform PDF Export handler
 */
export async function exportReportToPdf(reportData: ReportData): Promise<{ success: boolean; uri?: string }> {
  try {
    const html = buildReportHtml(reportData);

    if (Platform.OS === 'web') {
      // On web, Print.printAsync triggers native browser print / save-as-pdf
      await Print.printAsync({ html });
      return { success: true };
    } else {
      // On Android / iOS, generate PDF file in cache
      const { uri } = await Print.printToFileAsync({ html });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export Spendz Report - ${reportData.periodLabel}`,
          UTI: 'com.adobe.pdf',
        });
      }

      return { success: true, uri };
    }
  } catch (error) {
    console.error('Failed to generate or share PDF report:', error);
    throw error;
  }
}

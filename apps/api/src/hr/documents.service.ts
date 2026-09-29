import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';

type AttendanceReportDay = {
  dateLabel: string;
  dayLabel: string;
  statusCode: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: string;
  lateHours: string;
  earlyHours: string;
  overtimeHours: string;
};

type AttendanceReportSummary = {
  payableDays: string;
  present: number;
  absent: number;
  halfDays: number;
  doublePresent: number;
  weekOff: number;
  paidLeaves: number;
  unpaidLeaves: number;
  publicHoliday: number;
};

type AttendanceReportPayload = {
  title: string;
  companyName: string;
  gstin?: string | null;
  employee: {
    name: string;
    phone: string;
    branch: string;
    department: string;
    employeeCode: string;
    designation: string;
    schedule: string;
    scheduledWorkingHours: string;
  };
  summary: AttendanceReportSummary;
  days: AttendanceReportDay[];
};

@Injectable()
export class HrDocumentsService {
  private readonly logger = new Logger(HrDocumentsService.name);

  // Theme colors from global.css
  private readonly BRAND = {
    primary: '#FF6600', // HSL 25 100% 50%
    secondary: '#083358', // HSL 211 83% 18%
    foreground: '#0F2940', // HSL 215 64% 16%
    muted: '#6B7280', // muted-foreground
    border: '#E2E8F0',
    cardBg: '#F8FAFC',
    white: '#FFFFFF',
    success: '#16A34A',
    destructive: '#DC2626',
    info: '#2563EB',
    warning: '#F59E0B',
    primaryLight: '#FFF7ED', // primary/5
    secondaryLight: '#EFF6FF',
  } as const;

  getWatermarkMarkup(): string {
    return 'TRUROOT';
  }

  getLogoMarkup(): string {
    return 'TRUROOT REALTY';
  }

  async generateAttendanceReportPdf(
    report: AttendanceReportPayload | AttendanceReportPayload[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 24,
        });
        const buffers: Uint8Array[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const B = this.BRAND;
        const pageWidth = doc.page.width;
        const contentX = 24;
        const contentWidth = pageWidth - 48;

        const drawText = (
          value: string,
          x: number,
          y: number,
          width: number,
          options: PDFKit.Mixins.TextOptions = {},
        ) => {
          doc.text(value || '-', x, y, {
            width,
            ellipsis: true,
            ...options,
          });
        };

        const drawTable = (
          x: number,
          y: number,
          columns: Array<{ label: string; width: number }>,
          rows: string[][],
          rowHeight = 20,
          options: {
            headerFill?: string;
            headerText?: string;
            alternatingRows?: boolean;
            fontSize?: number;
          } = {},
        ) => {
          let cursorY = y;
          let cursorX = x;
          const fontSize = options.fontSize ?? 7;
          const headerFill = options.headerFill ?? B.secondary;
          const headerText = options.headerText ?? B.white;
          columns.forEach((column) => {
            doc
              .rect(cursorX, cursorY, column.width, rowHeight)
              .fillAndStroke(headerFill, B.border);
            doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(headerText);
            drawText(column.label, cursorX + 4, cursorY + 6, column.width - 8, {
              align: 'center',
            });
            cursorX += column.width;
          });
          cursorY += rowHeight;
          rows.forEach((row, rowIndex) => {
            cursorX = x;
            row.forEach((cell, index) => {
              const column = columns[index];
              const rowFill =
                options.alternatingRows && rowIndex % 2 === 0
                  ? B.cardBg
                  : B.white;
              doc
                .rect(cursorX, cursorY, column.width, rowHeight)
                .fillAndStroke(rowFill, B.border);
              doc.font('Helvetica').fontSize(fontSize).fillColor(B.foreground);
              drawText(cell, cursorX + 4, cursorY + 6, column.width - 8, {
                align: 'center',
              });
              cursorX += column.width;
            });
            cursorY += rowHeight;
          });
          return cursorY;
        };

        const drawFooterNote = () => {
          doc
            .font('Helvetica')
            .fontSize(6.5)
            .fillColor(B.muted)
            .text(
              'Legend: P Present | A Absent | HD Half Day | WO Week off | PH Public holiday | PL Paid leave | UL Unpaid leave | MC Manual correction',
              contentX,
              doc.page.height - 44,
              { width: contentWidth, lineBreak: false },
            );
        };

        const reports = Array.isArray(report) ? report : [report];
        const logoPath = this.getLogoPath();

        reports.forEach((currentReport, reportIndex) => {
          if (reportIndex > 0) {
            doc.addPage();
          }

        doc.rect(0, 0, doc.page.width, doc.page.height).fill(B.white);
        doc
          .rect(14, 14, doc.page.width - 28, doc.page.height - 28)
          .lineWidth(0.75)
          .strokeColor(B.border)
          .stroke();

        doc.save();
        doc.opacity(0.025);
        doc.fontSize(68).font('Helvetica-Bold').fillColor(B.secondary);
        doc.rotate(-28, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text('TRUROOT REALTY', doc.page.width / 2 - 250, doc.page.height / 2, {
          align: 'center',
          width: 500,
        });
        doc.restore();

        if (logoPath) {
          try {
            doc.image(logoPath, contentX, 17, { width: 160 });
          } catch {
            doc
              .font('Helvetica-Bold')
              .fontSize(12)
              .fillColor(B.primary)
              .text('TRUROOT', contentX, 18);
            doc
              .font('Helvetica-Bold')
              .fontSize(7)
              .fillColor(B.secondary)
              .text('REALTY CRM', contentX, 33);
          }
        } else {
          doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .fillColor(B.primary)
            .text('TRUROOT', contentX, 18);
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor(B.secondary)
            .text('REALTY CRM', contentX, 33);
        }

        doc.font('Helvetica-Bold').fontSize(15).fillColor(B.secondary);
        drawText(currentReport.title, contentX, 18, contentWidth, { align: 'center' });
        if (currentReport.gstin) {
          doc.font('Helvetica-Bold').fontSize(7).fillColor(B.muted);
          drawText(`GSTIN: ${currentReport.gstin}`, pageWidth - 180, 20, 156, {
            align: 'right',
          });
        }
        doc.font('Helvetica-Bold').fontSize(12).fillColor(B.secondary);
        drawText('Employee Details', contentX, 94, contentWidth);
        let cursorY = drawTable(
          contentX,
          118,
          [
            { label: 'Name', width: 110 },
            { label: 'Phone Number', width: 90 },
            { label: 'Branch', width: 170 },
            { label: 'Department', width: 78 },
            { label: 'Employee Id', width: 78 },
            { label: 'Designation', width: 90 },
            { label: 'Schedule', width: 96 },
            { label: 'Scheduled Working Hours', width: 82 },
          ],
          [
            [
              currentReport.employee.name,
              currentReport.employee.phone,
              currentReport.employee.branch,
              currentReport.employee.department,
              currentReport.employee.employeeCode,
              currentReport.employee.designation,
              currentReport.employee.schedule,
              currentReport.employee.scheduledWorkingHours,
            ],
          ],
          22,
          { alternatingRows: true },
        );

        cursorY += 10;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(B.secondary);
        drawText('Attendance summary', contentX, cursorY, contentWidth);
        cursorY += 22;
        cursorY = drawTable(
          contentX,
          cursorY,
          [
            { label: 'Payable Days', width: 84 },
            { label: 'Present', width: 76 },
            { label: 'Absent', width: 76 },
            { label: 'Half Days', width: 78 },
            { label: 'Double Present', width: 94 },
            { label: 'Week Off', width: 78 },
            { label: 'Paid Leaves', width: 88 },
            { label: 'Unpaid Leaves', width: 96 },
            { label: 'Public Holiday', width: 96 },
          ],
          [
            [
              currentReport.summary.payableDays,
              String(currentReport.summary.present),
              String(currentReport.summary.absent),
              String(currentReport.summary.halfDays),
              String(currentReport.summary.doublePresent),
              String(currentReport.summary.weekOff),
              String(currentReport.summary.paidLeaves),
              String(currentReport.summary.unpaidLeaves),
              String(currentReport.summary.publicHoliday),
            ],
          ],
          22,
          { alternatingRows: true },
        );

        cursorY += 12;
        const labelColumnWidth = 58;
        const dayColumnWidth = Math.floor(
          (contentWidth - labelColumnWidth) / Math.max(currentReport.days.length, 1),
        );
        const gridColumns = [
          { label: 'Date', width: labelColumnWidth },
          ...currentReport.days.map((day) => ({
            label: day.dateLabel,
            width: dayColumnWidth,
          })),
        ];
        const gridRows = [
          ['Day', ...currentReport.days.map((day) => day.dayLabel)],
          ['Status', ...currentReport.days.map((day) => day.statusCode)],
          ['Punch In', ...currentReport.days.map((day) => day.punchIn)],
          ['Punch Out', ...currentReport.days.map((day) => day.punchOut)],
          ['Hrs Worked', ...currentReport.days.map((day) => day.hoursWorked)],
          ['Late Hrs', ...currentReport.days.map((day) => day.lateHours)],
          ['Early Hrs', ...currentReport.days.map((day) => day.earlyHours)],
          ['Overtime Hrs', ...currentReport.days.map((day) => day.overtimeHours)],
        ];
        drawTable(contentX, cursorY, gridColumns, gridRows, 21, {
          headerFill: '#F1F5F9',
          headerText: B.secondary,
          alternatingRows: true,
          fontSize: 5.8,
        });

        drawFooterNote();
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private getLogoPath(): string | null {
    // Resolve the logo path relative to the API project root
    const possiblePaths = [
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'web',
        'src',
        'assets',
        'truroot-logo.png',
      ),
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'web',
        'src',
        'assets',
        'truroot-logo.png',
      ),
      path.resolve(
        process.cwd(),
        '..',
        'web',
        'src',
        'assets',
        'truroot-logo.png',
      ),
    ];
    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
    }
    return null;
  }

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const buffers: Uint8Array[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const B = this.BRAND;

        const period = this.extractRegex(
          html,
          /<h1>Payslip<\/h1>\s*<div class="sub">(.*?)<\/div>/s,
          '',
        );
        const employee = this.extractRegex(
          html,
          /<div class="label">Employee<\/div>\s*<div class="value">(.*?)<\/div>/s,
          '-',
        );
        const designation = this.extractRegex(
          html,
          /<div class="label">Designation<\/div>\s*<div class="value">(.*?)<\/div>/s,
          'Team Member',
        );
        const teamName = this.extractRegex(
          html,
          /<div class="label">Team<\/div>\s*<div class="value">(.*?)<\/div>/s,
          'No team assigned',
        );
        const payableDays = this.extractRegex(
          html,
          /<div class="label">Payable days<\/div>\s*<div class="value">(.*?)<\/div>/s,
          '0',
        );

        const baseSalary = this.extractRegex(
          html,
          /<span>Base salary<\/span>\s*<strong>(.*?)<\/strong>/s,
          'Rs. 0',
        );
        const attendanceDeduction = this.extractRegex(
          html,
          /<span>Attendance deduction<\/span>\s*<strong>(.*?)<\/strong>/s,
          'Rs. 0',
        );
        const incentive = this.extractRegex(
          html,
          /<span>Incentive<\/span>\s*<strong>(.*?)<\/strong>/s,
          'Rs. 0',
        );
        const netSalary = this.extractRegex(
          html,
          /<span>Net salary<\/span>\s*<strong>(.*?)<\/strong>/s,
          'Rs. 0',
        );

        // Extract individual attendance values
        const presentDays = this.extractRegex(
          html,
          /<div class="att-value att-present">(.*?)<\/div>/s,
          '0',
        );
        const leaveDays = this.extractRegex(
          html,
          /<div class="att-value att-leave">(.*?)<\/div>/s,
          '0',
        );
        const holidayDays = this.extractRegex(
          html,
          /<div class="att-value att-holiday">(.*?)<\/div>/s,
          '0',
        );
        const absentDays = this.extractRegex(
          html,
          /<div class="att-value att-absent">(.*?)<\/div>/s,
          '0',
        );

        // ─── PDF Layout ───

        // White background
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(B.white);

        // Decorative border
        doc
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .lineWidth(1)
          .strokeColor(B.border)
          .stroke();

        // Watermark
        doc.save();
        doc.opacity(0.03);
        doc.fontSize(80).font('Helvetica-Bold');
        doc.fillColor(B.secondary);
        doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text(
          'TRUROOT REALTY',
          doc.page.width / 2 - 250,
          doc.page.height / 2,
          { align: 'center' },
        );
        doc.restore();

        // ─── Header ───
        const logoPath = this.getLogoPath();
        if (logoPath) {
          try {
            doc.image(logoPath, 40, 35, { width: 140 });
          } catch {
            // Fallback to text if image fails
            doc
              .fillColor(B.primary)
              .fontSize(16)
              .font('Helvetica-Bold')
              .text('TRUROOT', 40, 40);
            doc
              .fillColor(B.secondary)
              .fontSize(9)
              .font('Helvetica-Bold')
              .text('REALTY', 40, 58);
          }
        } else {
          doc
            .fillColor(B.primary)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('TRUROOT', 40, 40);
          doc
            .fillColor(B.secondary)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('REALTY', 40, 58);
        }

        // Right side: PAYSLIP title and period
        doc
          .fillColor(B.secondary)
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('Payslip', doc.page.width - 200, 40, {
            align: 'right',
            width: 160,
          });
        doc
          .fillColor(B.muted)
          .fontSize(11)
          .font('Helvetica')
          .text(period, doc.page.width - 200, 68, {
            align: 'right',
            width: 160,
          });

        // Primary accent line
        doc
          .moveTo(40, 95)
          .lineTo(doc.page.width - 40, 95)
          .lineWidth(2)
          .strokeColor(B.primary)
          .stroke();

        // Thin border line below
        doc
          .moveTo(40, 98)
          .lineTo(doc.page.width - 40, 98)
          .lineWidth(0.5)
          .strokeColor(B.border)
          .stroke();

        // ─── Employee Info Grid ───
        const col1 = 40;
        const col2 = doc.page.width / 2 + 10;
        const row1 = 116;
        const row2 = 168;
        const gridW = doc.page.width / 2 - 50;
        const gridH = 42;

        const drawCard = (x: number, y: number, label: string, val: string) => {
          doc.rect(x, y, gridW, gridH).fill(B.cardBg);
          doc
            .rect(x, y, gridW, gridH)
            .lineWidth(0.5)
            .strokeColor(B.border)
            .stroke();
          // Orange left accent
          doc.rect(x, y, 3, gridH).fill(B.primary);
          doc
            .fillColor(B.muted)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(label.toUpperCase(), x + 12, y + 8);
          doc
            .fillColor(B.foreground)
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(val, x + 12, y + 22);
        };

        drawCard(col1, row1, 'Employee Name', employee);
        drawCard(col2, row1, 'Designation', designation);
        drawCard(col1, row2, 'Team', teamName);
        drawCard(col2, row2, 'Payable Days', `${payableDays} days`);

        // ─── Salary Details Table ───
        doc
          .fillColor(B.secondary)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Salary Details', 40, 232);

        const tableY = 250;
        const rowHeight = 32;

        // Table header
        doc.rect(40, tableY, doc.page.width - 80, rowHeight).fill(B.secondary);
        doc
          .fillColor(B.white)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Description', 55, tableY + 10);
        doc.text('Amount', doc.page.width - 150, tableY + 10, {
          align: 'right',
          width: 90,
        });

        // Table rows
        const drawRow = (
          y: number,
          desc: string,
          amt: string,
          isEven: boolean,
        ) => {
          doc
            .rect(40, y, doc.page.width - 80, rowHeight)
            .fill(isEven ? B.cardBg : B.white);
          doc
            .rect(40, y, doc.page.width - 80, rowHeight)
            .lineWidth(0.5)
            .strokeColor(B.border)
            .stroke();
          doc
            .fillColor(B.foreground)
            .fontSize(10)
            .font('Helvetica')
            .text(desc, 55, y + 10);
          doc
            .fillColor(B.foreground)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(amt, doc.page.width - 150, y + 10, {
              align: 'right',
              width: 90,
            });
        };

        drawRow(
          tableY + rowHeight,
          'Base Salary (including allowances)',
          baseSalary,
          true,
        );
        drawRow(
          tableY + rowHeight * 2,
          'Attendance Deductions',
          attendanceDeduction,
          false,
        );
        drawRow(
          tableY + rowHeight * 3,
          'Incentives & Performance Bonus',
          incentive,
          true,
        );

        // Net salary row
        const netY = tableY + rowHeight * 4;
        doc
          .rect(40, netY, doc.page.width - 80, rowHeight + 8)
          .fill(B.primaryLight);
        doc
          .rect(40, netY, doc.page.width - 80, rowHeight + 8)
          .lineWidth(1.5)
          .strokeColor(B.primary)
          .stroke();
        doc
          .fillColor(B.primary)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Net Payable Salary', 55, netY + 12);
        doc
          .fillColor(B.primary)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(netSalary, doc.page.width - 160, netY + 12, {
            align: 'right',
            width: 100,
          });

        // ─── Attendance Breakdown (stat cards) ───
        const attY = netY + rowHeight + 30;
        doc
          .fillColor(B.secondary)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Attendance Breakdown', 40, attY);

        const cardStartY = attY + 20;
        const cardW = (doc.page.width - 80 - 30) / 4; // 4 cards with 10px gaps
        const cardH = 52;
        const attCards = [
          {
            label: 'Present',
            value: presentDays,
            color: B.success,
            bg: '#F0FDF4',
          },
          {
            label: 'Absent',
            value: absentDays,
            color: B.destructive,
            bg: '#FEF2F2',
          },
          {
            label: 'Holiday',
            value: holidayDays,
            color: B.info,
            bg: '#EFF6FF',
          },
          { label: 'Leave', value: leaveDays, color: B.warning, bg: '#FFFBEB' },
        ];

        attCards.forEach((card, i) => {
          const x = 40 + i * (cardW + 10);
          doc.rect(x, cardStartY, cardW, cardH).fill(card.bg);
          doc
            .rect(x, cardStartY, cardW, cardH)
            .lineWidth(0.5)
            .strokeColor(B.border)
            .stroke();
          // Top accent bar
          doc.rect(x, cardStartY, cardW, 3).fill(card.color);
          doc
            .fillColor(B.muted)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(card.label.toUpperCase(), x + 10, cardStartY + 12);
          doc
            .fillColor(card.color)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(card.value, x + 10, cardStartY + 26);
        });

        // ─── Footer ───
        const footerY = doc.page.height - 60;
        doc
          .moveTo(40, footerY - 10)
          .lineTo(doc.page.width - 40, footerY - 10)
          .lineWidth(0.5)
          .strokeColor(B.border)
          .stroke();
        doc
          .fillColor(B.muted)
          .fontSize(8)
          .font('Helvetica')
          .text(
            'This is a system-generated payslip from Truroot Realty CRM and does not require a physical signature.',
            40,
            footerY,
            { align: 'center', width: doc.page.width - 80 },
          );

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate PDF document', error);
        reject(error);
      }
    });
  }

  private extractRegex(
    html: string,
    regex: RegExp,
    defaultValue: string,
  ): string {
    const match = html.match(regex);
    if (match && match[1]) {
      return match[1].replace(/<[^>]*>/g, '').trim();
    }
    return defaultValue;
  }
}

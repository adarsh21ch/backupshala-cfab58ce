import jsPDF from 'jspdf';
import logoUrl from '@/assets/backupshala-icon.png';

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  creatorName: string;
  issuedAt: string | Date;
  certificateCode: string;
  bodyLine?: string;
  signatureUrl?: string | null;
  verifyOrigin?: string;
}

// Convert a remote/asset URL to a base64 data URL so jsPDF can embed it.
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297; // A4 landscape width in mm
  const H = 210;

  // Brand colors (Backupshala)
  const greenR = 22, greenG = 163, greenB = 74;       // #16a34a
  const orangeR = 249, orangeG = 115, orangeB = 22;   // #f97316
  const inkR = 28, inkG = 25, inkB = 23;              // #1c1917
  const muteR = 120, muteG = 113, muteB = 108;        // #78716c
  const borderR = 212, borderG = 212, borderB = 212;  // #d4d4d4

  // Outer double border for that "official" feel
  pdf.setDrawColor(greenR, greenG, greenB);
  pdf.setLineWidth(1.4);
  pdf.rect(8, 8, W - 16, H - 16);
  pdf.setDrawColor(borderR, borderG, borderB);
  pdf.setLineWidth(0.3);
  pdf.rect(11, 11, W - 22, H - 22);

  // Top: Logo + brand wordmark
  const logoData = await fetchAsDataUrl(logoUrl);
  let cursorY = 24;
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', W / 2 - 9, cursorY, 18, 18);
    } catch { /* ignore image errors */ }
  }
  cursorY += 22;

  pdf.setTextColor(greenR, greenG, greenB);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('BACKUPSHALA', W / 2, cursorY, { align: 'center' });

  // Title
  cursorY += 14;
  pdf.setTextColor(inkR, inkG, inkB);
  pdf.setFontSize(28);
  pdf.text('Certificate of Completion', W / 2, cursorY, { align: 'center' });

  // Gradient-ish divider (two short lines for green→orange flavor)
  cursorY += 5;
  pdf.setDrawColor(greenR, greenG, greenB);
  pdf.setLineWidth(0.9);
  pdf.line(W / 2 - 22, cursorY, W / 2, cursorY);
  pdf.setDrawColor(orangeR, orangeG, orangeB);
  pdf.line(W / 2, cursorY, W / 2 + 22, cursorY);

  // Body
  cursorY += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(muteR, muteG, muteB);
  pdf.text('This is to certify that', W / 2, cursorY, { align: 'center' });

  cursorY += 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.setTextColor(greenR, greenG, greenB);
  pdf.text(data.studentName || 'Student', W / 2, cursorY, { align: 'center' });

  cursorY += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(muteR, muteG, muteB);
  pdf.text(data.bodyLine || 'has successfully completed', W / 2, cursorY, { align: 'center' });

  cursorY += 11;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(inkR, inkG, inkB);
  // Wrap long titles
  const titleLines = pdf.splitTextToSize(data.courseTitle || 'Course', W - 80);
  pdf.text(titleLines, W / 2, cursorY, { align: 'center' });
  cursorY += titleLines.length * 7;

  cursorY += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(muteR, muteG, muteB);
  pdf.text(`offered by ${data.creatorName || 'Creator'} on Backupshala`, W / 2, cursorY, { align: 'center' });

  // Date + code row
  const metaY = H - 40;
  pdf.setFontSize(10);
  pdf.setTextColor(muteR, muteG, muteB);
  pdf.text(`Issued: ${formatDate(data.issuedAt)}`, 40, metaY);
  pdf.setFont('courier', 'bold');
  pdf.setTextColor(greenR, greenG, greenB);
  pdf.text(data.certificateCode, W - 40, metaY, { align: 'right' });

  // Signature blocks
  const sigY = H - 28;
  pdf.setDrawColor(borderR, borderG, borderB);
  pdf.setLineWidth(0.3);
  // Creator signature line (left)
  pdf.line(40, sigY, 100, sigY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(muteR, muteG, muteB);
  pdf.text(data.creatorName || 'Creator', 70, sigY + 5, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text('Course Creator', 70, sigY + 9, { align: 'center' });

  // Platform signature (right) — image if provided, else text
  if (data.signatureUrl) {
    const sigData = await fetchAsDataUrl(data.signatureUrl);
    if (sigData) {
      try {
        // Place signature image just above the line
        pdf.addImage(sigData, 'PNG', W - 95, sigY - 18, 50, 16);
      } catch { /* ignore */ }
    }
  }
  pdf.line(W - 100, sigY, W - 40, sigY);
  pdf.setFontSize(9);
  pdf.text('Backupshala', W - 70, sigY + 5, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text('Authorized Signatory', W - 70, sigY + 9, { align: 'center' });

  // Verify footer
  const origin = data.verifyOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://backupshala.com');
  pdf.setFontSize(8);
  pdf.setTextColor(160, 160, 160);
  pdf.text(`Verify authenticity at ${origin}/verify/${data.certificateCode}`, W / 2, H - 14, { align: 'center' });

  return pdf.output('blob');
}

export async function downloadCertificatePdf(data: CertificateData) {
  const blob = await generateCertificatePdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backupshala-Certificate-${data.certificateCode}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

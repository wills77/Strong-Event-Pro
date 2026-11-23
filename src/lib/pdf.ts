import { jsPDF } from 'jspdf';
import type { InvoiceRecord, PaymentRecord, QuoteRecord } from '../types';

export function generateQuotePdf(quote: QuoteRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = 56;

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 595, 110, 'F');

  doc.setTextColor(197, 164, 109);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('STRONG EVENT PRO', margin, 48);

  doc.setTextColor(250, 249, 246);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Vos événements, notre expertise. — Casablanca, Maroc', margin, 68);
  doc.text(`DEVIS N° ${quote.reference}`, 595 - margin, 48, { align: 'right' });
  doc.text(`Statut : ${quote.status}`, 595 - margin, 66, { align: 'right' });
  doc.text(`Validité : ${quote.validityDays} jours`, 595 - margin, 82, { align: 'right' });

  y = 142;
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Client & Événement', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Client : ${quote.clientName} (${quote.clientEmail} / ${quote.clientPhone})`, margin, y);
  y += 16;
  doc.text(`Type d'événement : ${quote.eventType} — ${quote.guestCount} convives`, margin, y);
  y += 16;
  doc.text(`Date & Lieu : ${quote.eventDate} à ${quote.startTime} — ${quote.venue || quote.city}`, margin, y);
  y += 28;

  // Table Header
  doc.setFillColor(232, 223, 208);
  doc.rect(margin, y, 595 - margin * 2, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Prestation', margin + 8, y + 15);
  doc.text('Qté', 370, y + 15, { align: 'right' });
  doc.text('P.U (MAD)', 455, y + 15, { align: 'right' });
  doc.text('Total (MAD)', 595 - margin - 8, y + 15, { align: 'right' });
  y += 34;

  doc.setFont('helvetica', 'normal');
  const items = quote.items && quote.items.length > 0 ? quote.items : [];
  if (items.length === 0) {
    doc.text('Prestations à chiffrer selon cahier des charges', margin + 8, y);
    y += 20;
  } else {
    for (const item of items) {
      doc.setFont('helvetica', 'bold');
      doc.text(item.serviceName.slice(0, 52), margin + 8, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.quantity), 370, y, { align: 'right' });
      doc.text(item.unitPriceMad.toLocaleString('fr-FR'), 455, y, { align: 'right' });
      doc.text(item.totalPriceMad.toLocaleString('fr-FR'), 595 - margin - 8, y, { align: 'right' });
      y += 14;
      if (item.description) {
        doc.setTextColor(90, 90, 90);
        doc.setFontSize(8);
        doc.text(item.description.slice(0, 80), margin + 8, y);
        doc.setTextColor(17, 17, 17);
        doc.setFontSize(9);
        y += 14;
      }
      doc.setDrawColor(230, 225, 215);
      doc.line(margin, y, 595 - margin, y);
      y += 12;
      if (y > 720) {
        doc.addPage();
        y = 56;
      }
    }
  }

  y += 12;
  doc.setFontSize(10);
  if (quote.extraFeesMad > 0) {
    doc.text(`Frais supplémentaires : ${quote.extraFeesMad.toLocaleString('fr-FR')} MAD`, 595 - margin, y, { align: 'right' });
    y += 16;
  }
  if (quote.discountMad > 0) {
    doc.text(`Remise accordée : -${quote.discountMad.toLocaleString('fr-FR')} MAD`, 595 - margin, y, { align: 'right' });
    y += 16;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`TOTAL NET : ${quote.totalAmountMad.toLocaleString('fr-FR')} MAD`, 595 - margin, y + 6, { align: 'right' });

  y += 42;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'Document émis par STRONG EVENT PRO (Casablanca, Maroc). La réservation définitive est soumise à confirmation écrite.',
    margin,
    y
  );

  doc.save(`Devis-${quote.reference}.pdf`);
}

export function generateReceiptPdf(payment: PaymentRecord, invoice?: InvoiceRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 595, 100, 'F');
  doc.setTextColor(197, 164, 109);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('STRONG EVENT PRO — REÇU DE PAIEMENT', margin, 48);
  doc.setTextColor(250, 249, 246);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Référence : ${payment.reference}`, margin, 70);

  let y = 140;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(11);
  doc.text(`Type : ${payment.paymentType}`, margin, y);
  y += 20;
  doc.text(`Montant : ${payment.amountMad.toLocaleString('fr-FR')} MAD`, margin, y);
  y += 20;
  doc.text(`Mode de règlement : ${payment.method}`, margin, y);
  y += 20;
  doc.text(`Statut : ${payment.status}`, margin, y);
  y += 20;
  doc.text(`Date de confirmation : ${payment.paidAt ? payment.paidAt.slice(0, 10) : 'En attente'}`, margin, y);
  y += 20;
  if (payment.confirmedBy) {
    doc.text(`Validé par : ${payment.confirmedBy}`, margin, y);
    y += 20;
  }
  if (invoice) {
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`Facture associée : ${invoice.invoiceNumber}`, margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total facture : ${invoice.totalMad.toLocaleString('fr-FR')} MAD | Payé : ${invoice.paidMad.toLocaleString('fr-FR')} MAD | Solde restant : ${invoice.remainingMad.toLocaleString('fr-FR')} MAD`, margin, y);
  }

  doc.save(`Recu-${payment.reference}.pdf`);
}
